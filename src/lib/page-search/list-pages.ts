import { and, asc, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { notebooks, pages } from "@/db/schema";
import { containsKeyword } from "./count-pages";
import { HIGHLIGHT_END, HIGHLIGHT_START } from "./highlight-markers";
import type { PlaceCodes } from "./place-codes";
import { publishedIn } from "./published-in";

export const RESULTS_PAGE_SIZE = 20;

const HEADLINE_OPTIONS = `StartSel=${HIGHLIGHT_START}, StopSel=${HIGHLIGHT_END}, MaxWords=30, MinWords=12, MaxFragments=2, FragmentDelimiter=" … "`;
// Sans mot-clé, le début de la page suffit : l'extrait est recoupé à la
// longueur d'affichage, sans transférer tout le texte.
const PLAIN_EXCERPT_LENGTH = 400;

export interface PageHit {
  notebookId: string;
  number: number;
  municipalityName: string | null;
  departmentCode: string | null;
  excerpt: string;
}

export function listPages(
  place: PlaceCodes | undefined,
  keyword: string,
  pageIndex: number,
): Promise<PageHit[]> {
  const excerpt =
    keyword === ""
      ? sql<string>`left(${pages.text}, ${PLAIN_EXCERPT_LENGTH})`
      : sql<string>`ts_headline('simple', ${pages.text}, plainto_tsquery('simple', ${keyword}), ${HEADLINE_OPTIONS})`;
  return (
    getDatabase()
      .select({
        notebookId: pages.notebookId,
        number: pages.number,
        municipalityName: notebooks.municipalityName,
        departmentCode: notebooks.departmentCode,
        excerpt,
      })
      .from(pages)
      .innerJoin(notebooks, eq(notebooks.id, pages.notebookId))
      .where(
        and(
          publishedIn(place),
          keyword === "" ? undefined : containsKeyword(keyword),
        ),
      )
      // L'ordre de la clé primaire : la liste se lit cahier par cahier, et une
      // page de résultats s'arrête aux 20 premières lignes trouvées.
      .orderBy(asc(pages.notebookId), asc(pages.number))
      .limit(RESULTS_PAGE_SIZE)
      .offset((pageIndex - 1) * RESULTS_PAGE_SIZE)
  );
}
