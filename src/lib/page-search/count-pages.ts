import { type SQL, and, eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { notebooks, pages, placePageCounts, wordPageCounts } from "@/db/schema";
import type { PlaceCodes } from "./place-codes";
import { publishedIn } from "./published-in";

// Les pages qui contiennent chacun des mots du mot-clé, tels qu'écrits : le
// découpage et les minuscules de la configuration `simple`, celle de
// `pages.words`. « retraite » ne trouve ni « retraites » ni « retraité ».
export function containsKeyword(keyword: string): SQL {
  return sql`${pages.words} @@ plainto_tsquery('simple', ${keyword})`;
}

function placeCodes(place: PlaceCodes): string[] {
  return place.kind === "municipality" ? [place.code] : [...place.codes];
}

async function countPlacePages(place: PlaceCodes): Promise<number> {
  const [row] = await getDatabase()
    .select({
      pageCount: sql<number>`coalesce(sum(${placePageCounts.pageCount}), 0)::int`,
    })
    .from(placePageCounts)
    .where(inArray(placePageCounts.place, placeCodes(place)));
  return row.pageCount;
}

// Un seul mot, en France ou dans des départements : le compte précalculé
// (index unique `(scope, word)`), égal au compte en direct dès que
// `refresh_search_counts()` a suivi le dernier changement des pages. Sinon,
// plusieurs mots ou une commune : compte en direct, par l'index GIN de
// `pages.words` ou par les quelques pages de la commune.
function keywordCountQuery(
  place: PlaceCodes | undefined,
  keyword: string,
): SQL {
  const live = getDatabase()
    .select({ pageCount: sql`count(*)` })
    .from(pages)
    .innerJoin(notebooks, eq(notebooks.id, pages.notebookId))
    .where(and(publishedIn(place), containsKeyword(keyword)));
  if (place?.kind === "municipality") return sql`(${live})`;
  const precomputed = getDatabase()
    .select({ pageCount: sql`coalesce(sum(${wordPageCounts.pageCount}), 0)` })
    .from(wordPageCounts)
    .where(
      and(
        inArray(wordPageCounts.scope, place?.codes ?? ["FR"]),
        sql`${wordPageCounts.word} = lexemes.words[1]`,
      ),
    );
  return sql`case when cardinality(lexemes.words) = 1 then (${precomputed}) else (${live}) end`;
}

// Le nombre de pages publiées d'un lieu, d'un mot-clé, ou des deux. Le même
// filtre sert la liste des résultats (`listPages`).
export async function countPages(
  place: PlaceCodes | undefined,
  keyword: string,
): Promise<number> {
  if (keyword === "") {
    return place === undefined ? 0 : countPlacePages(place);
  }
  const [row] = await getDatabase().execute<{ page_count: number }>(sql`
    select (${keywordCountQuery(place, keyword)})::int as page_count
    from (select array(select lexeme from unnest(to_tsvector('simple', ${keyword}))) as words) as lexemes`);
  return row.page_count;
}
