import type { Database } from "@/db/client";
import { countPendingDeliveries } from "@/ingestion/delivery-rows";
import { INGEST_JOB, readLastJobRun } from "@/ingestion/job-runs";

// Le cron passe toutes les heures : au-delà de 75 min, un passage a sauté.
export const MAX_RUN_AGE_MS = 75 * 60 * 1000;

export interface IngestHealth {
  status: "ok" | "degraded";
  ingest: {
    lastRunAt: string | null;
    pendingDeliveries: number;
  };
}

export function healthStatus(
  lastRunAt: Date | undefined,
  now: Date,
): IngestHealth["status"] {
  if (lastRunAt === undefined) return "degraded";
  return now.getTime() - lastRunAt.getTime() > MAX_RUN_AGE_MS
    ? "degraded"
    : "ok";
}

// Ce que l'outil de supervision lit sans accès à la base : date du dernier
// passage du job et dépôts en attente. Ni hôte, ni bucket, ni message d'erreur.
export async function readIngestHealth(
  db: Database,
  now: Date,
): Promise<IngestHealth> {
  const [lastRun, pendingDeliveries] = await Promise.all([
    readLastJobRun(db, INGEST_JOB),
    countPendingDeliveries(db),
  ]);
  const lastRunAt = lastRun?.finishedAt;
  return {
    status: healthStatus(lastRunAt, now),
    ingest: {
      lastRunAt: lastRunAt?.toISOString() ?? null,
      pendingDeliveries,
    },
  };
}
