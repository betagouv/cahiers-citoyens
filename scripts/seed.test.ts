import { type ExecFileOptions, execFile } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const run = promisify(execFile);
const SEED = join(import.meta.dirname, "seed.sh");

interface SeedResult {
  code: number;
  stderr: string;
  calls: string[];
}

let bin = "";

// `bun` et `node` factices : chaque appel ajoute une ligne au journal.
async function stub(name: string): Promise<void> {
  const path = join(bin, name);
  await writeFile(
    path,
    `#!/bin/sh\necho "${name} $*" >> "${join(bin, "calls")}"\n`,
  );
  await chmod(path, 0o755);
}

async function seed(
  args: string[],
  env: { NODE_ENV?: "production"; LOCAL_BUCKET_DIR?: string } = {},
): Promise<SeedResult> {
  const PATH = `${bin}:/bin:/usr/bin`;
  const options: ExecFileOptions = { env: { NODE_ENV: "test", PATH, ...env } };
  let code = 0;
  let stderr = "";
  try {
    stderr = String((await run("sh", [SEED, ...args], options)).stderr);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && "stderr" in error)) {
      throw error;
    }
    code = Number(error.code);
    stderr = String(error.stderr);
  }
  const log = await readFile(join(bin, "calls"), "utf8").catch(() => "");
  return { code, stderr, calls: log.split("\n").filter(Boolean) };
}

beforeEach(async () => {
  bin = await mkdtemp(join(tmpdir(), "seed-"));
  await stub("node");
});

afterEach(async () => {
  await rm(bin, { recursive: true, force: true });
});

describe("seed.sh sans Bun (Scalingo)", () => {
  it("lance le job compilé avec les options", async () => {
    expect(await seed(["--if-empty"])).toEqual({
      code: 0,
      stderr: "",
      calls: ["node dist/jobs/load-geography.mjs --if-empty"],
    });
  });

  it("refuse --with-fake-notebooks", async () => {
    const result = await seed(["--with-fake-notebooks"]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("demande Bun");
    expect(result.calls).toEqual([]);
  });
});

describe("seed.sh avec Bun (local)", () => {
  beforeEach(async () => {
    await stub("bun");
  });

  it("charge la géographie depuis les sources TypeScript", async () => {
    expect((await seed(["--movements-url", "u"])).calls).toEqual([
      "bun scripts/load-geography.ts --movements-url u",
    ]);
  });

  it("publie ensuite 10 faux cahiers par le job ingest", async () => {
    const result = await seed(["--with-fake-notebooks", "--if-empty"], {
      LOCAL_BUCKET_DIR: "/tmp/bucket",
    });
    expect(result.calls).toEqual([
      "bun scripts/load-geography.ts --if-empty",
      "bun scripts/fake-data/deliver.ts --count 10 --out /tmp/bucket/incoming",
      "bun scripts/ingest-local.ts run",
    ]);
  });

  it("écrit les faux cahiers dans data/bucket par défaut", async () => {
    expect((await seed(["--with-fake-notebooks"])).calls[1]).toBe(
      "bun scripts/fake-data/deliver.ts --count 10 --out data/bucket/incoming",
    );
  });

  it("refuse --with-fake-notebooks en production", async () => {
    const result = await seed(["--with-fake-notebooks"], {
      NODE_ENV: "production",
    });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("NODE_ENV=production");
    expect(result.calls).toEqual([]);
  });
});
