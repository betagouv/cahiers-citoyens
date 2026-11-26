import { afterEach, describe, expect, it, vi } from "vitest";
import { openFileStorage } from "../src/ingestion/file-bucket";
import { runIngestCommand } from "../src/ingestion/ingest";

vi.mock("../src/ingestion/ingest", () => ({
  runIngestCommand: vi.fn(async () => 0),
}));

describe("ingest-local.ts", () => {
  afterEach(() => {
    process.exitCode = 0;
  });

  it("lance la commande contre le bucket local", async () => {
    const argv = process.argv;
    process.argv = ["bun", "scripts/ingest-local.ts", "withdraw", "CC_1"];
    try {
      await import("./ingest-local");
    } finally {
      process.argv = argv;
    }

    const [[args, ctx]] = vi.mocked(runIngestCommand).mock.calls;
    expect(args).toEqual(["withdraw", "CC_1"]);
    expect(ctx.openStorage).toBe(openFileStorage);
    expect(ctx.now()).toBeInstanceOf(Date);
    expect(ctx.print).toBe(console.log);
    expect(ctx.log).toBe(console.error);
    expect(process.exitCode).toBe(0);
  });
});
