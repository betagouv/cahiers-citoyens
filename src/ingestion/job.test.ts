import { afterEach, describe, expect, it, vi } from "vitest";
import { runIngestJob } from "./ingest-job";

vi.mock("./ingest-job", () => ({ runIngestJob: vi.fn(async () => 1) }));

describe("job ingest", () => {
  afterEach(() => {
    process.exitCode = 0;
  });

  it("lance le job avec les arguments et en reprend le code de sortie", async () => {
    const argv = process.argv;
    process.argv = ["node", "dist/jobs/ingest.mjs", "run"];
    try {
      await import("./job");
    } finally {
      process.argv = argv;
    }

    expect(runIngestJob).toHaveBeenCalledWith(["run"], process.env);
    expect(process.exitCode).toBe(1);
  });
});
