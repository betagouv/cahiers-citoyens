import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../db/client";
import { INGEST_JOB, readLastJobRun, recordJobRun } from "./job-runs";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));

const db = createDatabase("postgres://test/app");
const STARTED = "2026-11-26T10:00:00.000Z";
const FINISHED = "2026-11-26T10:00:05.000Z";

beforeEach(() => {
  fake.reset();
});

describe("recordJobRun", () => {
  it("remplace le dernier passage du job", async () => {
    await recordJobRun(db, {
      job: INGEST_JOB,
      startedAt: new Date(STARTED),
      finishedAt: new Date(FINISHED),
      errorCount: 1,
    });

    expect(fake.queries[0]).toEqual({
      sql: 'insert into "job_runs" ("job", "started_at", "finished_at", "error_count") values ($1, $2, $3, $4) on conflict ("job") do update set "started_at" = $5, "finished_at" = $6, "error_count" = $7',
      params: ["ingest", STARTED, FINISHED, 1, STARTED, FINISHED, 1],
    });
  });
});

describe("readLastJobRun", () => {
  it("lit le dernier passage du job", async () => {
    fake.reply([["ingest", STARTED, FINISHED, 0]]);

    await expect(readLastJobRun(db, INGEST_JOB)).resolves.toEqual({
      job: "ingest",
      startedAt: new Date(STARTED),
      finishedAt: new Date(FINISHED),
      errorCount: 0,
    });
    expect(fake.queries[0].params).toEqual(["ingest"]);
  });

  it("ne trouve rien avant le premier passage", async () => {
    fake.reply([]);

    await expect(readLastJobRun(db, INGEST_JOB)).resolves.toBeUndefined();
  });
});
