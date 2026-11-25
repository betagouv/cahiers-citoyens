import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readArchive } from "./read-archive";

const ARGV = process.argv;

afterEach(() => {
  process.argv = ARGV;
  vi.restoreAllMocks();
});

describe("deliver.ts", () => {
  it(
    "écrit un dépôt conforme au protocole et liste les cahiers modifiés",
    { timeout: 60_000 },
    async () => {
      const out = await mkdtemp(join(tmpdir(), "deliver-"));
      const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
      process.argv = [
        "node",
        "deliver.ts",
        "--count",
        "1",
        "--modify",
        "1",
        "--out",
        out,
      ];

      await import("./deliver");

      expect(await readdir(out)).toEqual(["delivery-2026-11-24-0930.zip"]);
      const records = await readArchive(
        await readFile(join(out, "delivery-2026-11-24-0930.zip")),
      );
      const [json, ...images] = records;
      expect(json.path).toMatch(/^CC_\d{5}_\d{6}_\w{5}_MD_10001\.json$/);
      const id = json.path.slice(0, -".json".length);
      expect(images.length).toBeGreaterThan(1);
      for (const { path, compressionMethod } of images) {
        expect(path.startsWith(`${id}_`)).toBe(true);
        expect(path).toMatch(/_\d+\.(png|jpg)$/);
        expect(compressionMethod).toBe(0);
      }
      expect(log.mock.calls.map(([line]) => String(line))).toEqual([
        expect.stringMatching(/^CC_\w+ : modifié \((text|image|metadata)\)$/),
        expect.stringMatching(
          /^1 cahiers écrits dans .*delivery-2026-11-24-0930\.zip en/,
        ),
      ]);
      await rm(out, { recursive: true });
    },
  );
});
