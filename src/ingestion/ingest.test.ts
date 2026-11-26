import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../db/client";
import { type CommandContext, runIngestCommand } from "./ingest";
import { type JobRun, runIngest } from "./ingest-run";
import { type IngestServices, openIngestServices } from "./ingest-services";
import { withdrawNotebook } from "./withdraw";

vi.mock("./ingest-run", () => ({ runIngest: vi.fn() }));
vi.mock("./ingest-services", () => ({ openIngestServices: vi.fn() }));
vi.mock("./withdraw", () => ({ withdrawNotebook: vi.fn() }));

const NOW = new Date("2026-11-26T10:00:00Z");
const RUN: JobRun = {
  event: "ingest.run",
  startedAt: NOW.toISOString(),
  finishedAt: NOW.toISOString(),
  locked: false,
  deliveries: [],
  duplicates: [],
  embedded: 0,
  errors: [],
};

let services: IngestServices;

function context(): CommandContext & { lines: unknown[] } {
  const lines: unknown[] = [];
  return {
    lines,
    env: { DATABASE_URL: "postgres://test/app" },
    openStorage: vi.fn(),
    now: () => NOW,
    print: (line) => lines.push(JSON.parse(line)),
    log: vi.fn(),
  };
}

beforeEach(() => {
  services = {
    db: createDatabase("postgres://test/app"),
    lock: { tryAcquire: vi.fn(), release: vi.fn() },
    store: {
      list: vi.fn(),
      copy: vi.fn(),
      remove: vi.fn(),
      download: vi.fn(),
      modifiedAt: vi.fn(),
      writeJson: vi.fn(),
    },
    images: { put: vi.fn(), remove: vi.fn() },
    embedPending: undefined,
    alert: vi.fn(),
    close: vi.fn(async () => {}),
  };
  vi.mocked(openIngestServices).mockReturnValue(services);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("runIngestCommand", () => {
  it("lance run, écrit le rapport en une ligne et ferme la base", async () => {
    vi.mocked(runIngest).mockResolvedValue(RUN);
    const ctx = context();

    await expect(runIngestCommand([], ctx)).resolves.toBe(0);

    expect(ctx.lines).toEqual([RUN]);
    expect(openIngestServices).toHaveBeenCalledWith(
      ctx.env,
      ctx.openStorage,
      ctx.log,
    );
    const [[deps]] = vi.mocked(runIngest).mock.calls;
    expect(deps).toMatchObject({ db: services.db, now: ctx.now, log: ctx.log });
    expect(services.close).toHaveBeenCalledOnce();
  });

  it("sort en erreur si le run rapporte une erreur", async () => {
    vi.mocked(runIngest).mockResolvedValue({
      ...RUN,
      errors: [{ scope: "embed", message: "503" }],
    });
    await expect(runIngestCommand(["run"], context())).resolves.toBe(1);
  });

  it("rapporte au format du run une configuration invalide", async () => {
    vi.mocked(openIngestServices).mockImplementation(() => {
      throw new Error("DATABASE_URL est obligatoire");
    });
    const ctx = context();

    await expect(runIngestCommand([], ctx)).resolves.toBe(1);

    expect(ctx.lines).toEqual([
      {
        ...RUN,
        errors: [{ scope: "run", message: "DATABASE_URL est obligatoire" }],
      },
    ]);
  });

  it("retire un cahier avec son motif", async () => {
    vi.mocked(withdrawNotebook).mockResolvedValue("withdrawn");
    const ctx = context();

    await expect(
      runIngestCommand(["withdraw", "CC_1", "--reason", "other"], ctx),
    ).resolves.toBe(0);

    expect(ctx.lines).toEqual([
      {
        event: "ingest.withdraw",
        id: "CC_1",
        reason: "other",
        result: "withdrawn",
      },
    ]);
    expect(withdrawNotebook).toHaveBeenCalledWith(
      { db: services.db, storage: services.images, log: ctx.log },
      "CC_1",
      "other",
    );
    expect(services.close).toHaveBeenCalledOnce();
  });

  it("rapporte l'échec d'un retrait", async () => {
    vi.mocked(withdrawNotebook).mockRejectedValue(
      new Error("Cahier inconnu : CC_1"),
    );
    const ctx = context();
    const args = ["withdraw", "CC_1", "--reason", "other"];

    await expect(runIngestCommand(args, ctx)).resolves.toBe(1);
    vi.mocked(openIngestServices).mockImplementation(() => {
      throw new Error("DATABASE_URL est obligatoire");
    });
    await expect(runIngestCommand(args, ctx)).resolves.toBe(1);

    expect(ctx.lines).toEqual([
      {
        event: "ingest.withdraw",
        id: "CC_1",
        reason: "other",
        error: "Cahier inconnu : CC_1",
      },
      {
        event: "ingest.withdraw",
        id: "CC_1",
        reason: "other",
        error: "DATABASE_URL est obligatoire",
      },
    ]);
  });

  it("refuse une commande mal formée sans rien ouvrir", async () => {
    const ctx = context();

    await expect(runIngestCommand(["publish"], ctx)).resolves.toBe(1);

    expect(ctx.lines).toEqual([
      {
        event: "ingest.usage",
        error:
          "usage : ingest [run] | ingest withdraw <id_cahier> --reason <motif>",
      },
    ]);
    expect(openIngestServices).not.toHaveBeenCalled();
  });
});
