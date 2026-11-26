import { eq, lte } from "drizzle-orm";
import type { Database } from "../db/client";
import { alertNotices } from "../db/schema";

// Une alerte répétée (archive bloquée, chunks en attente) repart au plus une
// fois par jour tant que la situation dure.
export const NOTICE_REPEAT_MS = 24 * 60 * 60 * 1000;

// Note l'envoi de l'alerte `key` et renvoie true, sauf si elle est déjà
// partie depuis moins de `NOTICE_REPEAT_MS`. Une seule requête : deux jobs
// simultanés n'enverraient pas deux fois la même alerte.
export async function claimNotice(
  db: Database,
  key: string,
  now: Date,
): Promise<boolean> {
  const cutoff = new Date(now.getTime() - NOTICE_REPEAT_MS);
  const claimed = await db
    .insert(alertNotices)
    .values({ key, sentAt: now })
    .onConflictDoUpdate({
      target: alertNotices.key,
      set: { sentAt: now },
      setWhere: lte(alertNotices.sentAt, cutoff),
    })
    .returning({ key: alertNotices.key });
  return claimed.length > 0;
}

// La situation est rentrée dans l'ordre : la prochaine alerte part aussitôt.
export async function clearNotice(db: Database, key: string): Promise<void> {
  await db.delete(alertNotices).where(eq(alertNotices.key, key));
}
