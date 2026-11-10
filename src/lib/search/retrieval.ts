import { asc, cosineDistance, desc, isNotNull, sql } from "drizzle-orm";
import { getDatabase } from "../../db/client";
import { chunks } from "../../db/schema";

export interface Candidate {
  id: number;
  notebookId: string;
  content: string;
}

const candidateColumns = {
  id: chunks.id,
  notebookId: chunks.notebookId,
  content: chunks.content,
};

// Plein texte : `websearch_to_tsquery` accepte la saisie libre (guillemets,
// `or`, `-mot`) sans jamais lever d'erreur de syntaxe.
export async function searchFullText(
  query: string,
  limit: number,
): Promise<Candidate[]> {
  const tsQuery = sql`websearch_to_tsquery('french', ${query})`;
  return getDatabase()
    .select(candidateColumns)
    .from(chunks)
    .where(sql`${chunks.search} @@ ${tsQuery}`)
    .orderBy(desc(sql`ts_rank(${chunks.search}, ${tsQuery})`), asc(chunks.id))
    .limit(limit);
}

export async function searchByVector(
  vector: number[],
  limit: number,
): Promise<Candidate[]> {
  const distance = cosineDistance(chunks.embedding, vector);
  return getDatabase()
    .select(candidateColumns)
    .from(chunks)
    .where(isNotNull(chunks.embedding))
    .orderBy(asc(distance), asc(chunks.id))
    .limit(limit);
}
