import { parseDatabaseUrl } from "./database-url";
import { type PingableDatabase, pingDatabase } from "./ping-database";
import { type JobReport, runJob } from "./run-job";

export function ingest(
  databaseUrl: string | undefined,
  connect: (url: string) => PingableDatabase,
): Promise<JobReport> {
  return runJob("ingest.run", () =>
    pingDatabase(connect(parseDatabaseUrl(databaseUrl))),
  );
}
