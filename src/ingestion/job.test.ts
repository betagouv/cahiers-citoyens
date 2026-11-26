import { afterEach, describe, expect, it, vi } from "vitest";
import { runIngestCommand } from "./ingest";
import { openS3Storage } from "./ingest-services";

vi.mock("./ingest", () => ({ runIngestCommand: vi.fn(async () => 1) }));

describe("job ingest", () => {
  afterEach(() => {
    process.exitCode = 0;
  });

  it("lance la commande avec le stockage S3 et en reprend le code de sortie", async () => {
    const argv = process.argv;
    process.argv = ["node", "dist/jobs/ingest.mjs", "run"];
    try {
      await import("./job");
    } finally {
      process.argv = argv;
    }

    const [[args, ctx]] = vi.mocked(runIngestCommand).mock.calls;
    expect(args).toEqual(["run"]);
    expect(ctx.env).toBe(process.env);
    expect(ctx.openStorage).toBe(openS3Storage);
    expect(ctx.now()).toBeInstanceOf(Date);
    expect(ctx.print).toBe(console.log);
    expect(ctx.log).toBe(console.error);
    expect(process.exitCode).toBe(1);
  });
});
