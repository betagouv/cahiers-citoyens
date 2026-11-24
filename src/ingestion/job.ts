import { sql } from "drizzle-orm";

import { createDatabase } from "@/db/client";

import { parseDatabaseUrl } from "./database-url";
import { runJob } from "./run-job";

async function pingDatabase(): Promise<void> {
  const database = createDatabase(parseDatabaseUrl(process.env.DATABASE_URL));
  try {
    await database.execute(sql`select 1`);
  } finally {
    await database.$client.end();
  }
}

const report = await runJob("ingest.run", pingDatabase);
console.log(JSON.stringify(report));
if (!report.ok) process.exitCode = 1;
