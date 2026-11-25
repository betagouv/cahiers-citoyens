import { mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerFonts } from "./hands";
import { writeDataset } from "./write-dataset";

let out = "";

beforeAll(async () => {
  registerFonts(join(import.meta.dirname, "fonts"));
  out = await mkdtemp(join(tmpdir(), "write-dataset-"));
});

afterAll(async () => {
  await rm(out, { recursive: true });
});

describe("writeDataset", () => {
  it(
    "écrit scan, transcription et manifeste, et retire les cahiers en trop",
    { timeout: 30_000 },
    async () => {
      await mkdir(join(out, "notebooks", "notebook-0009"), { recursive: true });
      await mkdir(join(out, "notebooks", "notes"), { recursive: true });
      const logs: string[] = [];

      await writeDataset({ count: 1, out, seed: "42" }, (line) =>
        logs.push(line),
      );

      expect(logs).toEqual(["1/1 cahiers"]);
      expect((await readdir(join(out, "notebooks"))).sort()).toEqual([
        "notebook-0001",
        "notes",
      ]);
      expect(
        (await readdir(join(out, "notebooks", "notebook-0001"))).sort(),
      ).toEqual(["scan.pdf", "transcription.txt"]);
      const manifest = await readFile(join(out, "manifest.jsonl"), "utf8");
      expect(manifest).toMatch(/^\{"id":"notebook-0001",.*\}\n$/);
    },
  );
});
