import Link from "next/link";
import type { PlaceCodes } from "@/lib/page-search/place-codes";
import { pageSearchHref } from "@/lib/page-search/search-params";
import { suggestWords } from "@/lib/page-search/suggest-words";
import { pageCountLabel } from "@/lib/page-search/word-suggestion";

interface WordAlternativesProps {
  place: PlaceCodes | undefined;
  placeCode: string;
  keyword: string;
}

// Un mot-clé sans page, souvent un début de mot (« retr ») : les mots des
// pages du lieu qui commencent ainsi, chacun menant à ses pages.
export async function WordAlternatives({
  place,
  placeCode,
  keyword,
}: WordAlternativesProps) {
  const suggestions = await suggestWords(keyword, place);
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
