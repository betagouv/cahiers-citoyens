import { utimes } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../db/client";
import type { SendAlert } from "./alert";
import { claimNotice } from "./alert-notices";
import { createFileBucket } from "./file-bucket";
import { alertStaleIncoming } from "./stale-incoming";
import { type TempDir, tempDir } from "./test-zip";

vi.mock("./alert-notices", () => ({ claimNotice: vi.fn() }));

const db = createDatabase("postgres://test/app");
const NOW = new Date("2026-11-26T10:00:00Z");
const OLD = "delivery-2026-11-26-0800.zip";
const FRESH = "delivery-2026-11-26-0845.zip";

let dir: TempDir;

beforeEach(async () => {
  dir = await tempDir("stale-");
  vi.mocked(claimNotice).mockResolvedValue(true);
});

afterEach(async () => {
  await dir.remove();
  vi.mocked(claimNotice).mockReset();
});

async function setup() {
  const root = join(dir.path, "bucket");
  const store = createFileBucket(root);
  for (const [name, at] of [
    [OLD, "2026-11-26T08:00:00Z"],
    [FRESH, "2026-11-26T08:45:00Z"],
  ]) {
    await store.writeJson(`incoming/${name}`, "zip");
    await utimes(join(root, "incoming", name), new Date(at), new Date(at));
  }
  const alert = vi.fn<SendAlert>(() => Promise.resolve());
  return { store, alert, deps: { db, store, alert, now: () => NOW } };
}

describe("alertStaleIncoming", () => {
  it("alerte sur un ZIP resté plus de 90 min dans incoming/", async () => {
    const { alert, deps } = await setup();

    await expect(alertStaleIncoming(deps)).resolves.toEqual([]);

    expect(claimNotice).toHaveBeenCalledWith(db, `incoming.stale:${OLD}`, NOW);
    expect(alert.mock.calls).toEqual([
      [
        {
          event: "incoming.stale",
          text: `${OLD} attend dans incoming/ depuis 120 min.`,
          details: { delivery: OLD, minutes: 120 },
        },
      ],
    ]);
  });

  it("n'alerte pas deux fois dans la journée", async () => {
    const { alert, deps } = await setup();
    vi.mocked(claimNotice).mockResolvedValue(false);

    await alertStaleIncoming(deps);

    expect(alert).not.toHaveBeenCalled();
  });

  it("rapporte une archive illisible sans arrêter les autres", async () => {
    const { store, alert, deps } = await setup();
    vi.spyOn(store, "modifiedAt").mockRejectedValueOnce(new Error("refusé"));

    await expect(alertStaleIncoming(deps)).resolves.toEqual([
      { scope: OLD, message: "refusé" },
    ]);
    expect(alert).not.toHaveBeenCalled();
  });
});
