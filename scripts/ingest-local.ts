import { openFileStorage } from "../src/ingestion/file-bucket";
import { runIngestCommand } from "../src/ingestion/ingest";

// Le job `ingest` contre un dossier local qui tient lieu de bucket
// (`LOCAL_BUCKET_DIR`, `data/bucket` par défaut). Mêmes commandes que le cron.
process.exitCode = await runIngestCommand(process.argv.slice(2), {
  env: process.env,
  openStorage: openFileStorage,
  now: () => new Date(),
  print: console.log,
  log: console.error,
});
