import { embedPendingChunks } from "../../scripts/embed-chunks";
import { type Database, createDatabase } from "../db/client";
import { createAlbertClient } from "../lib/albert";
import { type SendAlert, createAlerter } from "./alert";
import { parseS3Settings } from "../lib/s3-storage";
import { parseDatabaseUrl } from "./database-url";
import { type ImageStorage, createS3ImageStorage } from "./image-storage";
import type { EmbedPending } from "./ingest-run";
import { type ObjectStore, createS3ObjectStore } from "./object-store";
import { type RunLock, createAdvisoryLock } from "./run-lock";

export type Env = Record<string, string | undefined>;

export interface Storage {
  store: ObjectStore;
  images: ImageStorage;
}

// Ressources d'une commande `ingest`, ouvertes à partir de l'environnement.
export interface IngestServices extends Storage {
  db: Database;
  lock: RunLock;
  embedPending: EmbedPending | undefined;
  alert: SendAlert;
  close(): Promise<void>;
}

export type OpenStorage = (env: Env) => Storage;

// Bucket S3 de production, variables `S3_*` comme pour les scans.
export function openS3Storage(env: Env): Storage {
  const settings = parseS3Settings(env);
  return {
    store: createS3ObjectStore(settings),
    images: createS3ImageStorage(settings),
  };
}

function albertEmbedder(
  db: Database,
  env: Env,
  log: (message: string) => void,
): EmbedPending | undefined {
  const apiKey = env.ALBERT_API_KEY;
  if (!apiKey) return undefined;
  const albert = createAlbertClient({ apiKey, baseUrl: env.ALBERT_BASE_URL });
  return () =>
    embedPendingChunks(
      db,
      albert,
      { batchSize: 32, limit: Number.MAX_SAFE_INTEGER },
      log,
    );
}

export function openIngestServices(
  env: Env,
  openStorage: OpenStorage,
  log: (message: string) => void,
): IngestServices {
  const url = parseDatabaseUrl(env.DATABASE_URL);
  const storage = openStorage(env);
  const db = createDatabase(url);
  return {
    ...storage,
    db,
    lock: createAdvisoryLock(url),
    embedPending: albertEmbedder(db, env, log),
    // Webhook optionnel : sans lui, les alertes ne vont qu'aux logs.
    alert: createAlerter({ webhookUrl: env.ALERT_WEBHOOK_URL, fetch, log }),
    close: () => db.$client.end(),
  };
}
