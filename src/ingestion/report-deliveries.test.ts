import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../db/client";
import type { SendAlert } from "./alert";
import { createFileBucket } from "./file-bucket";
import { reportFinishedDeliveries } from "./report-deliveries";
import {
  type UnreportedDelivery,
  listUnreportedDeliveries,
  markReported,
} from "./report-rows";
import { type TempDir, tempDir } from "./test-zip";

vi.mock("./report-rows", () => ({
  listUnreportedDeliveries: vi.fn(),
  markReported: vi.fn(),
}));

const db = createDatabase("postgres://test/app");
let dir: TempDir;

beforeEach(async () => {
  dir = await tempDir("report-");
  vi.mocked(markReported).mockResolvedValue();
});

afterEach(async () => {
  await dir.remove();
  vi.mocked(listUnreportedDeliveries).mockReset();
  vi.mocked(markReported).mockReset();
});

function delivery(
  id: number,
  status: UnreportedDelivery["status"],
): UnreportedDelivery {
  return {
    id,
    name: `delivery-2026-11-2${id}-0930.zip`,
    status,
    attempts: 3,
    failure: "base injoignable",
    receivedAt: new Date("2026-11-24T09:31:12Z"),
    finishedAt: new Date("2026-11-24T09:35:00Z"),
    counts: { published: 1, replaced: 0, unchanged: 0 },
    errors:
      status === "rejected" ? [{ code: "missing-image", message: "x" }] : [],
  };
}

function setup() {
  const store = createFileBucket(join(dir.path, "bucket"));
  const alert = vi.fn<SendAlert>(() => Promise.resolve());
  return { store, alert, deps: { db, store, alert } };
}

async function readReport(name: string): Promise<unknown> {
  return JSON.parse(
    await readFile(join(dir.path, "bucket/reports", name), "utf8"),
  );
}

describe("reportFinishedDeliveries", () => {
  it("écrit un rapport par dépôt fini, le note et alerte sur refus ou abandon", async () => {
    const { alert, deps } = setup();
    vi.mocked(listUnreportedDeliveries).mockResolvedValue([
      delivery(1, "applied"),
      delivery(2, "rejected"),
      delivery(3, "failed"),
    ]);

    await expect(reportFinishedDeliveries(deps)).resolves.toEqual([]);

    await expect(
      readReport("delivery-2026-11-21-0930.json"),
    ).resolves.toMatchObject({
      status: "applied",
      notebooks: { published: 1 },
    });
    await expect(
      readReport("delivery-2026-11-22-0930.json"),
    ).resolves.toMatchObject({ status: "rejected" });
    await expect(
      readReport("delivery-2026-11-23-0930.json"),
    ).resolves.toMatchObject({ status: "failed" });
    expect(vi.mocked(markReported).mock.calls).toEqual([
      [db, 1],
      [db, 2],
      [db, 3],
    ]);
    expect(alert.mock.calls.map(([sent]) => sent.event)).toEqual([
      "delivery.rejected",
      "delivery.failed",
    ]);
  });

  it("laisse un rapport impossible à écrire au job suivant, sans bloquer les autres", async () => {
    const { deps } = setup();
    vi.mocked(listUnreportedDeliveries).mockResolvedValue([
      delivery(1, "applied"),
      delivery(2, "applied"),
    ]);
    vi.mocked(markReported).mockRejectedValueOnce(new Error("base coupée"));

    await expect(reportFinishedDeliveries(deps)).resolves.toEqual([
      { scope: "delivery-2026-11-21-0930.zip", message: "base coupée" },
    ]);
    expect(markReported).toHaveBeenCalledTimes(2);
  });
});
