import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { jobRuns } from "../db/schema";

export const INGEST_JOB = "ingest";

export interface JobRunRecord {
  job: string;
  startedAt: Date;
  finishedAt: Date;
  errorCount: number;
}

// Remplace le dernier passage du job : une ligne par job.
export async function recordJobRun(
  db: Database,
  run: JobRunRecord,
): Promise<void> {
  const { startedAt, finishedAt, errorCount } = run;
  await db.insert(jobRuns).values(run).onConflictDoUpdate({
    target: jobRuns.job,
    set: { startedAt, finishedAt, errorCount },
  });
}

export async function readLastJobRun(
  db: Database,
  job: string,
): Promise<JobRunRecord | undefined> {
  const [row] = await db.select().from(jobRuns).where(eq(jobRuns.job, job));
  return row;
}
