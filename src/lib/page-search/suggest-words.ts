import { and, desc, eq, inArray, like, sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { notebooks, pages, wordPageCounts } from "@/db/schema";
import { foldAccents } from "./fold-accents";
import { likePrefix } from "./like-prefix";
import type { PlaceCodes } from "./place-codes";
import { publishedIn } from "./published-in";
import { MIN_WORD_PREFIX_LENGTH, type WordSuggestion } from "./word-suggestion";

export const MAX_WORD_SUGGESTIONS = 8;

// France entière ou départements : comptes précalculés, index
// `(scope, search_word text_pattern_ops)`.
function fromCounts(scopes: readonly string[], pattern: string) {
  const pageCount = sql<number>`sum(${wordPageCounts.pageCount})::int`;
  return getDatabase()
    .select({ word: wordPageCounts.word, pageCount })
    .from(wordPageCounts)
    .where(
      and(
        inArray(wordPageCounts.scope, [...scopes]),
        like(wordPageCounts.searchWord, pattern),
      ),
    )
    .groupBy(wordPageCounts.word)
    .orderBy(desc(pageCount), wordPageCounts.word)
    .limit(MAX_WORD_SUGGESTIONS);
}

// Une commune n'a que quelques cahiers : ses pages sont lues directement
// (index de `notebooks.insee_code`, puis clé primaire de `pages`).
function fromPages(place: PlaceCodes, pattern: string) {
  const word = sql<string>`w.lexeme`;
  const pageCount = sql<number>`count(*)::int`;
  return getDatabase()
    .select({ word, pageCount })
    .from(pages)
    .innerJoin(notebooks, eq(notebooks.id, pages.notebookId))
    .crossJoinLateral(sql`unnest(${pages.words}) as w`)
    .where(and(publishedIn(place), sql`fold_accents(w.lexeme) like ${pattern}`))
    .groupBy(word)
    .orderBy(desc(pageCount), word)
    .limit(MAX_WORD_SUGGESTIONS);
}

// Mots des pages publiées qui commencent par la saisie, sans tenir compte des
// accents ni des majuscules (« retr » trouve « retraite » et « rétrocession »),
// les plus fréquents d'abord.
export async function suggestWords(
  value: string,
  place: PlaceCodes | undefined,
): Promise<WordSuggestion[]> {
  const prefix = foldAccents(value.trim());
  if (prefix.length < MIN_WORD_PREFIX_LENGTH) return [];
  const pattern = likePrefix(prefix);
  if (place?.kind === "municipality") return fromPages(place, pattern);
  return fromCounts(place?.codes ?? ["FR"], pattern);
}
