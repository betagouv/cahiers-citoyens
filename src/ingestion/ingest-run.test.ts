import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../db/client";
import { listPendingDeliveries } from "./delivery-rows";
import { type IngestDependencies, runIngest } from "./ingest-run";
import { recordJobRun } from "./job-runs";
import { monitorRun } from "./monitor-run";
import { processDelivery } from "./process-delivery";
import { receiveIncoming } from "./receive-incoming";

vi.mock("./delivery-rows", () => ({ listPendingDeliveries: vi.fn() }));
vi.mock("./process-delivery", () => ({ processDelivery: vi.fn() }));
vi.mock("./receive-incoming", () => ({ receiveIncoming: vi.fn() }));
vi.mock("./monitor-run", () => ({ monitorRun: vi.fn() }));
vi.mock("./job-runs", () => ({ INGEST_JOB: "ingest", recordJobRun: vi.fn() }));

const A = "delivery-2026-11-24-0930.zip";
const B = "delivery-2026-11-25-0930.zip";

function clock() {
  let minute = 0;
  return () => new Date(Date.UTC(2026, 10, 26, 10, minute++));
}

function deps(overrides: Partial<IngestDependencies> = {}): IngestDependencies {
  return {
    db: createDatabase("postgres://test/app"),
    lock: {
      tryAcquire: vi.fn(async () => true),
      release: vi.fn(async () => {}),
    },
    store: {
      list: vi.fn(),
      copy: vi.fn(),
      remove: vi.fn(),
      download: vi.fn(),
      modifiedAt: vi.fn(),
      writeJson: vi.fn(),
    },
    images: { put: vi.fn(), remove: vi.fn() },
    embedPending: vi.fn(async () => 12),
    alert: vi.fn(),
    now: clock(),
    log: vi.fn(),
    ...overrides,
  };
}

const ROWS = [
  { id: 1, name: A, status: "failed" as const, attempts: 1 },
  { id: 2, name: B, status: "received" as const, attempts: 0 },
];

beforeEach(() => {
  vi.mocked(receiveIncoming).mockResolvedValue({
    errors: [],
    left: [],
    duplicates: [],
  });
  vi.mocked(monitorRun).mockResolvedValue([]);
  vi.mocked(recordJobRun).mockResolvedValue();
  vi.mocked(listPendingDeliveries).mockResolvedValue(ROWS);
  vi.mocked(processDelivery).mockImplementation(async (_, row) => ({
    move: { name: row.name, from: row.status, to: "applied" },
    errors: [],
  }));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("runIngest", () => {
  it("reçoit, traite chaque dépôt en attente par ordre de nom, vectorise, rapporte et note son passage", async () => {
    const d = deps();
    vi.mocked(receiveIncoming).mockResolvedValue({
      errors: [],
      left: [],
      duplicates: ["delivery-2026-11-20-0930.zip"],
    });

    await expect(runIngest(d)).resolves.toEqual({
      event: "ingest.run",
      startedAt: "2026-11-26T10:00:00.000Z",
      finishedAt: "2026-11-26T10:01:00.000Z",
      locked: false,
      deliveries: [
        { name: A, from: "failed", to: "applied" },
        { name: B, from: "received", to: "applied" },
      ],
      duplicates: ["delivery-2026-11-20-0930.zip"],
      embedded: 12,
      errors: [],
    });
    expect(d.lock.release).toHaveBeenCalledOnce();
    expect(monitorRun).toHaveBeenCalledWith(d);
    expect(recordJobRun).toHaveBeenCalledWith(d.db, {
      job: "ingest",
      startedAt: new Date("2026-11-26T10:00:00.000Z"),
      finishedAt: new Date("2026-11-26T10:01:00.000Z"),
      errorCount: 0,
    });
  });

  it("ajoute les erreurs du monitoring et celle de la note de passage", async () => {
    vi.mocked(monitorRun).mockResolvedValue([
      { scope: "monitor", message: "liste" },
    ]);
    vi.mocked(recordJobRun).mockRejectedValue(new Error("base coupée"));

    const run = await runIngest(deps());

    expect(run.errors).toEqual([
      { scope: "monitor", message: "liste" },
      { scope: "run", message: "base coupée" },
    ]);
    expect(vi.mocked(recordJobRun).mock.calls[0][1].errorCount).toBe(1);
  });

  it("s'arrête sans rien faire si une autre exécution tient le verrou", async () => {
    const d = deps();
    vi.mocked(d.lock.tryAcquire).mockResolvedValue(false);

    const run = await runIngest(d);

    expect(run).toMatchObject({ locked: true, deliveries: [], errors: [] });
    expect(receiveIncoming).not.toHaveBeenCalled();
    expect(d.embedPending).not.toHaveBeenCalled();
    expect(recordJobRun).not.toHaveBeenCalled();
    expect(d.log).toHaveBeenCalledWith(
      "Une autre exécution du job ingest tient le verrou : arrêt.",
    );
  });

  it("ne traite pas un dépôt resté dans incoming/ et rassemble les erreurs", async () => {
    vi.mocked(receiveIncoming).mockResolvedValue({
      errors: [{ scope: B, message: "copie impossible" }],
      left: [B],
      duplicates: [],
    });
    vi.mocked(processDelivery).mockResolvedValue({
      move: { name: A, from: "failed", to: "failed" },
      errors: [{ scope: A, message: "panne" }],
    });

    const run = await runIngest(deps());

    expect(processDelivery).toHaveBeenCalledOnce();
    expect(run.deliveries).toEqual([{ name: A, from: "failed", to: "failed" }]);
    expect(run.errors).toEqual([
      { scope: B, message: "copie impossible" },
      { scope: A, message: "panne" },
    ]);
  });

  it("garde les dépôts appliqués quand Albert échoue ou n'est pas configuré", async () => {
    const failing = await runIngest(
      deps({ embedPending: vi.fn(() => Promise.reject(new Error("503"))) }),
    );
    const missing = await runIngest(deps({ embedPending: undefined }));

    for (const run of [failing, missing]) {
      expect(run.deliveries.map(({ to }) => to)).toEqual([
        "applied",
        "applied",
      ]);
      expect(run.embedded).toBe(0);
    }
    expect(failing.errors).toEqual([{ scope: "embed", message: "503" }]);
    expect(missing.errors).toEqual([
      {
        scope: "embed",
        message: "ALBERT_API_KEY absente : chunks non vectorisés",
      },
    ]);
  });

  it("rapporte une erreur du job sans lever, et libère le verrou", async () => {
    const d = deps();
    vi.mocked(receiveIncoming).mockRejectedValue(new Error("liste impossible"));
    vi.mocked(d.lock.release).mockRejectedValue(new Error("fermeture"));

    const run = await runIngest(d);

    expect(run).toMatchObject({ locked: false, deliveries: [], embedded: 0 });
    expect(run.errors).toEqual([
      { scope: "run", message: "liste impossible" },
      { scope: "run", message: "fermeture" },
    ]);
  });
});
