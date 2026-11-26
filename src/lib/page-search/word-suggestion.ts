import { formatNumber } from "@/lib/format";

export const MIN_WORD_PREFIX_LENGTH = 2;

// Une proposition du champ « Mot-clé » : un mot tel qu'il est écrit dans les
// pages, et le nombre de pages publiées du lieu qui le contiennent, exactement
// ce que listera `/search?q=<mot>`.
export interface WordSuggestion {
  word: string;
  pageCount: number;
}

// « 1 page », « 1 312 pages » (espace fine insécable des milliers).
export function pageCountLabel(pageCount: number): string {
  return `${formatNumber(pageCount)} ${pageCount > 1 ? "pages" : "page"}`;
}
