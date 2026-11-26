import { asc, eq, sql } from "drizzle-orm";
import type { Database, Transaction } from "../db/client";
import { chunks, notebooks, pages } from "../db/schema";
import type { ImageStorage } from "./image-storage";
import type { WithdrawalReason } from "./notebook-status";
import { removeFiles } from "./remove-files";
import { refreshSearchCounts } from "./search-counts";

export interface WithdrawDependencies {
  db: Database;
  storage: ImageStorage;
  log: (message: string) => void;
}

export type WithdrawResult = "withdrawn" | "already-withdrawn";

// Retire le cahier dans la transaction et renvoie les clés de ses images. Les
// pages restent en base, hors de la recherche (`status`) : elles gardent les
// clés à supprimer si la suppression doit être relancée. Les chunks partent,
// car la recherche par question ne filtre pas sur le statut.
async function markWithdrawn(
  tx: Transaction,
  id: string,
  reason: WithdrawalReason,
): Promise<{ result: WithdrawResult; imageKeys: string[] }> {
  const [row] = await tx
    .select({ status: notebooks.status })
    .from(notebooks)
    .where(eq(notebooks.id, id))
    .for("update");
  if (row === undefined) throw new Error(`Cahier inconnu : ${id}`);
  // Un second retrait garde le motif et la date du premier.
  if (row.status === "published") {
    await tx
      .update(notebooks)
      .set({
        status: "withdrawn",
        withdrawalReason: reason,
        withdrawnAt: sql`now()`,
      })
      .where(eq(notebooks.id, id));
    await tx.delete(chunks).where(eq(chunks.notebookId, id));
  }
  const images = await tx
    .select({ imageKey: pages.imageKey })
    .from(pages)
    .where(eq(pages.notebookId, id))
    .orderBy(asc(pages.number));
  return {
    result: row.status === "published" ? "withdrawn" : "already-withdrawn",
    imageKeys: images.map(({ imageKey }) => imageKey),
  };
}

// `ingest withdraw <id> --reason …` : le cahier quitte le site et la
// recherche, puis ses images servies sont supprimées. Relancé, il ne change
// rien en base et refait les étapes suivantes. Un dépôt qui contient de
// nouveau le cahier le republie.
export async function withdrawNotebook(
  { db, storage, log }: WithdrawDependencies,
  id: string,
  reason: WithdrawalReason,
): Promise<WithdrawResult> {
  const { result, imageKeys } = await db.transaction((tx) =>
    markWithdrawn(tx, id, reason),
  );
  await refreshSearchCounts(db);
  await removeFiles(storage, imageKeys, log);
  return result;
}
