"use client";

import { foldAccents } from "@/lib/page-search/fold-accents";
import { parseWordSuggestions } from "@/lib/page-search/responses";
import {
  MIN_WORD_PREFIX_LENGTH,
  type WordSuggestion,
} from "@/lib/page-search/word-suggestion";
import { useDebouncedJson } from "./use-debounced-json";

export interface WordSuggestions {
  typed: string;
  // `undefined` : rien à proposer (saisie trop courte) ou erreur.
  data: WordSuggestion[] | undefined;
  loading: boolean;
}

function suggestionsUrl(typed: string, placeCode: string | undefined) {
  if (foldAccents(typed).length < MIN_WORD_PREFIX_LENGTH) return null;
  const params = new URLSearchParams({ q: typed });
  if (placeCode !== undefined) params.set("place", placeCode);
  return `/api/suggestions/words?${params}`;
}

// Les mots qui commencent par la saisie, dans le lieu choisi. Lus par le
// champ « Mot-clé » pour sa liste, et par le formulaire pour savoir si la
// saisie est un mot entier.
export function useWordSuggestions(
  value: string,
  placeCode: string | undefined,
): WordSuggestions {
  const typed = value.trim();
  const url = suggestionsUrl(typed, placeCode);
  const { data, loading } = useDebouncedJson(url, parseWordSuggestions);
  return { typed, data: url === null ? undefined : data, loading };
}
