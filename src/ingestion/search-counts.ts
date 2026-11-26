import { sql } from "drizzle-orm";
import type { Database } from "../db/client";

// Recalcule les comptes des suggestions de recherche, après chaque commit qui
// change les pages publiées (voir docs/search-by-place-and-keyword.md).
export async function refreshSearchCounts(db: Database): Promise<void> {
  await db.execute(sql`select refresh_search_counts()`);
}
