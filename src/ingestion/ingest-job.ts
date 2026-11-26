import { openFileStorage } from "./file-bucket";
import { runIngestCommand } from "./ingest";
import { type Env, type Storage, openS3Storage } from "./ingest-services";

// Bucket S3, ou dossier local si `LOCAL_BUCKET_DIR` est défini : comme les
// images servies par le site, pour exercer le job sur un build local.
export function openJobStorage(env: Env): Storage {
  return env.LOCAL_BUCKET_DIR ? openFileStorage(env) : openS3Storage(env);
}

// Le job `ingest` tel que le lancent le cron (`dist/jobs/ingest.mjs`) et
// `POST /api/deliveries/notify` : ligne JSON sur la sortie standard, suivi sur
// la sortie d'erreur. Renvoie le code de sortie.
export function runIngestJob(args: string[], env: Env): Promise<number> {
  return runIngestCommand(args, {
    env,
    openStorage: openJobStorage,
    now: () => new Date(),
    print: console.log,
    log: console.error,
  });
}
