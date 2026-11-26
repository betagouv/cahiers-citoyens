import { and, asc, eq } from "drizzle-orm";
import { getDatabase } from "../db/client";
import { lines, notebooks } from "../db/schema";
import type { Polygon } from "../ingestion/notebook";
import { containsAnyWord, keywordWords } from "./page-search/keyword-match";

// Une ligne qui contient le mot-clé : sa page, et le contour de son polygone
// en attribut `points` de SVG, au pixel près de l'image d'origine.
export interface KeywordLine {
  page: number;
  points: string;
}

function outlinePoints(polygon: Polygon): string {
  return polygon[0]
    .map(([x, y]) => `${Math.round(x)},${Math.round(y)}`)
    .join(" ");
}

// Les lignes de la version en ligne d'un cahier publié qui contiennent l'un
// des mots du mot-clé, avec la règle du surlignage de la transcription
// (`splitKeyword`). Un cahier compte quelques milliers de lignes au plus,
// lues par la clé primaire ; le filtre tourne ici, pas en SQL, pour que
// l'image et le texte marquent exactement les mêmes mots.
export async function listKeywordLines(
  id: string,
  version: number,
  keyword: string,
): Promise<KeywordLine[]> {
  const words = keywordWords(keyword);
  if (words.size === 0) return [];
  const rows = await getDatabase()
    .select({ page: lines.page, text: lines.text, polygon: lines.polygon })
    .from(lines)
    .innerJoin(notebooks, eq(notebooks.id, lines.notebookId))
    .where(
      and(
        eq(lines.notebookId, id),
        eq(notebooks.status, "published"),
        eq(notebooks.onlineVersion, version),
      ),
    )
    .orderBy(asc(lines.page), asc(lines.position));
  return rows
    .filter((row) => containsAnyWord(row.text, words))
    .map((row) => ({ page: row.page, points: outlinePoints(row.polygon) }));
}
