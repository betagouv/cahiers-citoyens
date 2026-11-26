import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "@/db/client";
import { countPendingDeliveries } from "@/ingestion/delivery-rows";
import { readLastJobRun } from "@/ingestion/job-runs";
import { healthStatus, readIngestHealth } from "./ingest-health";

vi.mock("@/ingestion/delivery-rows", () => ({
  countPendingDeliveries: vi.fn(),
}));
vi.mock("@/ingestion/job-runs", () => ({
  INGEST_JOB: "ingest",
  readLastJobRun: vi.fn(),
}));

const db = createDatabase("postgres://test/app");
const NOW = new Date("2026-11-26T10:00:00Z");

beforeEach(() => {
  vi.mocked(countPendingDeliveries).mockResolvedValue(2);
});

describe("healthStatus", () => {
  it("se dégrade sans passage du job, ou après 75 min", () => {
    expect(healthStatus(undefined, NOW)).toBe("degraded");
    expect(healthStatus(new Date("2026-11-26T08:45:00Z"), NOW)).toBe("ok");
    expect(healthStatus(new Date("2026-11-26T08:44:59Z"), NOW)).toBe(
      "degraded",
    );
  });
});

describe("readIngestHealth", () => {
  it("donne le dernier passage du job et les dépôts en attente", async () => {
    vi.mocked(readLastJobRun).mockResolvedValue({
      job: "ingest",
      startedAt: new Date("2026-11-26T09:50:00Z"),
      finishedAt: new Date("2026-11-26T09:51:00Z"),
      errorCount: 1,
    });

    await expect(readIngestHealth(db, NOW)).resolves.toEqual({
      status: "ok",
      ingest: { lastRunAt: "2026-11-26T09:51:00.000Z", pendingDeliveries: 2 },
    });
    expect(readLastJobRun).toHaveBeenCalledWith(db, "ingest");
  });

  it("se dégrade avant le premier passage", async () => {
    vi.mocked(readLastJobRun).mockResolvedValue(undefined);

    await expect(readIngestHealth(db, NOW)).resolves.toEqual({
      status: "degraded",
      ingest: { lastRunAt: null, pendingDeliveries: 2 },
    });
  });
});
