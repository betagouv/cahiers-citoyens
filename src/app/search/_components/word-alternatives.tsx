import Link from "next/link";
import { pageSearchHref } from "@/lib/page-search/search-params";
import {
  type WordSuggestion,
  pageCountLabel,
} from "@/lib/page-search/word-suggestion";

interface WordAlternativesProps {
  suggestions: WordSuggestion[];
  placeCode: string;
  keyword: string;
}

// Les mots des pages du lieu qui commencent par la saisie, chacun menant à
// ses pages.
export function WordAlternatives({
  suggestions,
  placeCode,
  keyword,
}: WordAlternativesProps) {
  if (suggestions.length === 0) return null;
  return (
    <>
      <p id="word-alternatives-title" className="fr-mb-1w">
        Mots des cahiers publiés qui commencent par « {keyword} » :
      </p>
      <ul aria-labelledby="word-alternatives-title">
        {suggestions.map(({ word, pageCount }) => (
          <li key={word}>
            <Link href={pageSearchHref(placeCode, word, 1)}>{word}</Link> (
            {pageCountLabel(pageCount)})
          </li>
        ))}
      </ul>
    </>
  );
}
