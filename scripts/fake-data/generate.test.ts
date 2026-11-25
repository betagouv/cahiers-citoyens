import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const ARGV = process.argv;

afterEach(() => {
  process.argv = ARGV;
  vi.restoreAllMocks();
});

describe("generate.ts", () => {
  it(
    "écrit les faux cahiers demandés en ligne de commande",
    { timeout: 30_000 },
    async () => {
      const out = await mkdtemp(join(tmpdir(), "generate-"));
      const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
      process.argv = ["node", "generate.ts", "--count", "1", "--out", out];

      await import("./generate");

      expect(await readdir(join(out, "notebooks"))).toEqual(["notebook-0001"]);
      expect(log).toHaveBeenLastCalledWith(
        expect.stringMatching(/^1 cahiers écrits dans .* en \d+\.\d s$/),
      );
      await rm(out, { recursive: true });
    },
  );
});
