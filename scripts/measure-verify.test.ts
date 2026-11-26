import { readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  afterAll,
  beforeAll,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { type TempDir, tempDir, zipBuffer } from "../src/ingestion/test-zip";

const ARGV = process.argv;
let dir: TempDir;

beforeAll(async () => {
  dir = await tempDir("measure-verify-");
});

afterEach(() => {
  process.argv = ARGV;
  vi.restoreAllMocks();
  vi.resetModules();
});

afterAll(async () => {
  await dir.remove();
});

async function run(args: string[]): Promise<string[]> {
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  process.argv = ["node", "measure-verify.ts", ...args];
  await import("./measure-verify");
  return log.mock.calls.map(([line]) => String(line));
}

describe("measure-verify.ts", () => {
  it(
    "génère un dépôt, le vérifie et donne durée et mémoire",
    { timeout: 60_000 },
    async () => {
      const out = join(dir.path, "out");
      const lines = await run(["--count", "1", "--out", out]);
      expect(await readdir(out)).toEqual(["delivery-2026-11-24-0930.zip"]);
      expect(lines).toEqual([
        expect.stringMatching(
          /delivery-2026-11-24-0930\.zip : \d+ Mo, 1 cahiers, \d+ pages, accepté$/,
        ),
        expect.stringMatching(
          /^vérifié en \d+\.\d s, mémoire résidente maximale \d+ Mo$/,
        ),
      ]);
    },
  );

  it("mesure un ZIP existant, même refusé", async () => {
    const zip = await dir.write(
      "delivery-2026-11-24-0931.zip",
      await zipBuffer([]),
    );
    expect((await run(["--zip", zip]))[0]).toMatch(
      /: 0 Mo, refusé \(1 erreurs\)$/,
    );
  });
});
