import { execFile } from "node:child_process";
import { copyFile, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const run = promisify(execFile);

interface ProcessResult {
  code: number;
  stdout: string;
}

async function runNode(file: string, cwd: string): Promise<ProcessResult> {
  try {
    const { stdout } = await run("node", [file], {
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

const JOBS = ["ingest.mjs", "load-geography.mjs"];

describe("build-jobs", () => {
  let isolated = "";

  beforeAll(async () => {
    await import("./build-jobs.mjs");
    isolated = await mkdtemp(join(tmpdir(), "jobs-"));
    for (const job of JOBS) {
      await copyFile(join("dist/jobs", job), join(isolated, job));
    }
  }, 30_000);

  afterAll(async () => {
    await rm(isolated, { recursive: true, force: true });
  });

  it("produit un seul fichier par job", async () => {
    expect((await readdir("dist/jobs")).sort()).toEqual(JOBS);
  });

  it("tourne sous Node sans node_modules, yauzl et le SDK S3 compris, et journalise l'échec en JSON", async () => {
    const result = await runNode("ingest.mjs", isolated);
    expect(result.code).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      event: "ingest.run",
      deliveries: [],
      errors: [{ scope: "run", message: "DATABASE_URL est obligatoire" }],
    });
  });

  it("lance le chargement géographique sous Node sans node_modules, en échec sans DATABASE_URL", async () => {
    const result = await runNode("load-geography.mjs", isolated);
    expect(result.code).toBe(1);
  });
});
