import { eq, sql } from "drizzle-orm";
import type { Transaction } from "../db/client";
import {
  chunks,
  lines,
  notebookVersions,
  notebooks,
  pages,
} from "../db/schema";
import { batches } from "./batches";
import { notebookRows } from "./notebook-rows";
import type { WriteChange } from "./plan";

// Écrit la nouvelle version d'un cahier dans la transaction du dépôt. La
// version doit exister avant que `notebooks.online_version` la désigne (clé
// étrangère) : la ligne du cahier est créée d'abord si besoin, puis mise à
// jour. Supprimer les pages supprime leurs lignes et leurs chunks ; les
// chunks sans page viennent de l’ancien `scripts/load.ts`.
export async function writeNotebookVersion(
  tx: Transaction,
  change: WriteChange,
  deliveryId: number,
): Promise<void> {
  const id = change.verified.notebook.id;
  const rows = notebookRows(change, deliveryId);
  await tx.insert(notebooks).values({ id }).onConflictDoNothing();
  await tx.insert(notebookVersions).values(rows.version);
  await tx
    .update(notebooks)
    .set({ ...rows.notebook, importedAt: sql`now()` })
    .where(eq(notebooks.id, id));
  await tx.delete(chunks).where(eq(chunks.notebookId, id));
  await tx.delete(pages).where(eq(pages.notebookId, id));
  for (const batch of batches(rows.pages)) {
    await tx.insert(pages).values(batch);
  }
  for (const batch of batches(rows.lines)) {
    await tx.insert(lines).values(batch);
  }
  for (const batch of batches(rows.chunks)) {
    await tx.insert(chunks).values(batch);
  }
}
