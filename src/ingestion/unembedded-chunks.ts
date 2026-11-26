import { and, count, isNull, lt } from "drizzle-orm";
import type { Database } from "../db/client";
import { chunks } from "../db/schema";
import type { SendAlert } from "./alert";
import { claimNotice, clearNotice } from "./alert-notices";

export const UNEMBEDDED_CHUNKS_MS = 24 * 60 * 60 * 1000;

const NOTICE_KEY = "chunks.unembedded";

export interface UnembeddedChunksDependencies {
  db: Database;
  alert: SendAlert;
  now: () => Date;
}

export async function countStaleChunks(
  db: Database,
  before: Date,
): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(chunks)
    .where(and(isNull(chunks.embedding), lt(chunks.createdAt, before)));
  return row?.count ?? 0;
}

// Après la vectorisation : alerte s'il reste des chunks sans embedding depuis
// plus de 24 h (clé Albert absente, Albert en panne), au plus une fois par
// jour. Leur rattrapage réarme l'alerte.
export async function alertUnembeddedChunks({
  db,
  alert,
  now,
}: UnembeddedChunksDependencies): Promise<void> {
  const at = now();
  const stale = await countStaleChunks(
    db,
    new Date(at.getTime() - UNEMBEDDED_CHUNKS_MS),
  );
  if (stale === 0) return clearNotice(db, NOTICE_KEY);
  if (!(await claimNotice(db, NOTICE_KEY, at))) return;
  await alert({
    event: "chunks.unembedded",
    text: `${stale} chunk(s) attendent leur embedding depuis plus de 24 h : la recherche sémantique ne les trouve pas.`,
    details: { chunks: stale },
  });
}
