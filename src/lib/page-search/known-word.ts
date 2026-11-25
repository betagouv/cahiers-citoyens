import type { WordSuggestion } from "./word-suggestion";

// Le mot-clé est-il un mot des pages, et non un début de mot ? Oui s'il vient
// d'être choisi dans les suggestions, ou s'il est exactement l'une d'elles
// (en minuscules, comme les mots indexés). Tant que ce n'est pas le cas, le
// bouton annonce les pages du lieu seul, comme sur la maquette.
export function isKnownWord(
  keyword: string,
  chosenWord: string | null,
  suggestions: readonly WordSuggestion[] | undefined,
): boolean {
  const word = keyword.trim();
  if (word === "") return false;
  if (word === chosenWord) return true;
  const lower = word.toLowerCase();
  return suggestions?.some((suggestion) => suggestion.word === lower) ?? false;
}
