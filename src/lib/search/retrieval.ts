import {
  type SQL,
  and,
  asc,
  cosineDistance,
  desc,
  eq,
  isNotNull,
  sql,
} from "drizzle-orm";
import { getDatabase } from "../../db/client";
import { chunks, notebooks } from "../../db/schema";

export interface Candidate {
  id: number;
  notebookId: string;
  // Page citée, vide pour un cahier chargé avant les dépôts.
  page: number | null;
  content: string;
}

const candidateColumns = {
  id: chunks.id,
  notebookId: chunks.notebookId,
  page: chunks.page,
  content: chunks.content,
};

// Le retrait supprime les chunks d'un cahier ; la jointure garantit en plus
// qu'aucun passage d'un cahier retiré ne sort, même entre les deux.
const publishedNotebook = and(
  eq(notebooks.id, chunks.notebookId),
  eq(notebooks.status, "published"),
);

// Requête plein texte qui accepte un passage contenant au moins un mot de la
// question. `plainto_tsquery` normalise la saisie libre (racines françaises,
// mots vides retirés) sans erreur de syntaxe possible, mais exige tous les
// mots : une question en langage courant (« Que disent les habitants… »)
// ne trouverait rien. Sa forme texte ne relie les lexèmes, toujours entre
// apostrophes, que par `&` : les remplacer par `|` donne le OU. Le classement
// revient à `ts_rank`, puis à la fusion RRF et au reclassement.
export function anyWordQuery(query: string): SQL {
  return sql`replace(plainto_tsquery('french', ${query})::text, '&', '|')::tsquery`;
}

export async function searchFullText(
  query: string,
  limit: number,
): Promise<Candidate[]> {
  const tsQuery = anyWordQuery(query);
  return getDatabase()
    .select(candidateColumns)
    .from(chunks)
    .innerJoin(notebooks, publishedNotebook)
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
    .innerJoin(notebooks, publishedNotebook)
    .where(isNotNull(chunks.embedding))
    .orderBy(asc(distance), asc(chunks.id))
    .limit(limit);
}
