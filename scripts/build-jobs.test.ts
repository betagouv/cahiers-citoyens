import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const run = promisify(execFile);

interface ProcessResult {
  code: number;
  stdout: string;
}

async function runNode(args: string[], cwd: string): Promise<ProcessResult> {
  try {
    const { stdout } = await run("node", args, {
      cwd,
      env: { PATH: process.env.PATH, NODE_ENV: "production" },
    });
    return { code: 0, stdout };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      typeof error.code === "number" &&
      "stdout" in error &&
      typeof error.stdout === "string"
    ) {
      return { code: error.code, stdout: error.stdout };
    }
    throw error;
  }
}

describe("build-jobs", () => {
  let outdir = "";

  beforeAll(async () => {
    outdir = await mkdtemp(join(tmpdir(), "jobs-"));
    await run("node", ["scripts/build-jobs.mjs", "--outdir", outdir]);
  });

  afterAll(async () => {
    await rm(outdir, { recursive: true, force: true });
  });

  it("produit un seul fichier par job", async () => {
    expect(await readdir(outdir)).toEqual(["ingest.mjs"]);
  });

  it("tourne sous Node sans node_modules et journalise l'échec en JSON", async () => {
    const result = await runNode(["ingest.mjs"], outdir);
    expect(result.code).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      event: "ingest.run",
      ok: false,
      error: "DATABASE_URL est obligatoire",
    });
  });
});
