import { describe, expect, it, vi } from "vitest";
import { createDatabase } from "../db/client";
import { createFileBucket } from "./file-bucket";
import { monitorRun } from "./monitor-run";
import { reportFinishedDeliveries } from "./report-deliveries";
import { alertStaleIncoming } from "./stale-incoming";
import { alertUnembeddedChunks } from "./unembedded-chunks";

vi.mock("./report-deliveries", () => ({ reportFinishedDeliveries: vi.fn() }));
vi.mock("./stale-incoming", () => ({ alertStaleIncoming: vi.fn() }));
vi.mock("./unembedded-chunks", () => ({ alertUnembeddedChunks: vi.fn() }));

const deps = {
  db: createDatabase("postgres://test/app"),
  store: createFileBucket("unused"),
  alert: vi.fn(),
  now: () => new Date(0),
};

describe("monitorRun", () => {
  it("rapporte, surveille incoming/ puis les chunks, et rassemble les erreurs", async () => {
    vi.mocked(reportFinishedDeliveries).mockResolvedValue([
      { scope: "a.zip", message: "écriture" },
    ]);
    vi.mocked(alertStaleIncoming).mockRejectedValue(new Error("liste"));
    vi.mocked(alertUnembeddedChunks).mockResolvedValue();

    await expect(monitorRun(deps)).resolves.toEqual([
      { scope: "a.zip", message: "écriture" },
      { scope: "monitor", message: "liste" },
    ]);
    expect(alertUnembeddedChunks).toHaveBeenCalledWith(deps);
  });
});
