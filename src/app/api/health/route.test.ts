import { afterEach, expect, it, vi } from "vitest";
import { getDatabase } from "@/db/client";
import { readIngestHealth } from "@/lib/health/ingest-health";
import { GET } from "./route";

vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn(() => "db") }));
vi.mock("@/lib/health/ingest-health", () => ({ readIngestHealth: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
});

it("répond l'état du job d'ingestion, sans cache", async () => {
  const health = {
    status: "ok" as const,
    ingest: { lastRunAt: "2026-11-26T09:51:00.000Z", pendingDeliveries: 0 },
  };
  vi.mocked(readIngestHealth).mockResolvedValue(health);

  const response = await GET();

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/json");
  expect(response.headers.get("cache-control")).toBe("no-store");
  await expect(response.json()).resolves.toEqual(health);
  expect(vi.mocked(readIngestHealth).mock.calls[0][0]).toBe(getDatabase());
});

it("répond 503 sans détail quand la base est injoignable", async () => {
  vi.mocked(readIngestHealth).mockRejectedValue(
    new Error("connect ECONNREFUSED db.interne:5432"),
  );
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});

  const response = await GET();

  expect(response.status).toBe(503);
  await expect(response.json()).resolves.toEqual({ status: "error" });
  expect(logged).toHaveBeenCalledOnce();
});
