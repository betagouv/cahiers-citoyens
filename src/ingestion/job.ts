import { createDatabase } from "../db/client";
import { ingest } from "./ingest";
import { exitCode } from "./run-job";

const report = await ingest(process.env.DATABASE_URL, createDatabase);
console.log(JSON.stringify(report));
process.exitCode = exitCode(report);
