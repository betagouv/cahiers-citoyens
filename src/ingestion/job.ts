import { runIngestJob } from "./ingest-job";

process.exitCode = await runIngestJob(process.argv.slice(2), process.env);
