import { runIngestCommand } from "./ingest";
import { openS3Storage } from "./ingest-services";

process.exitCode = await runIngestCommand(process.argv.slice(2), {
  env: process.env,
  openStorage: openS3Storage,
  now: () => new Date(),
  print: console.log,
  log: console.error,
});
