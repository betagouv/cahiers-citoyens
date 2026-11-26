import { fr } from "@codegouvfr/react-dsfr";
import type { ResolvedPlace } from "@/lib/page-search/find-place";
import { listPages } from "@/lib/page-search/list-pages";
import {
  notAWordTitle,
  placePagesTitle,
  resultsSummary,
} from "@/lib/page-search/results-summary";
import { pageSearchHref } from "@/lib/page-search/search-params";
import { suggestWords } from "@/lib/page-search/suggest-words";
import { HitList } from "./hit-list";
import { NoPages } from "./no-pages";
import { WordAlternatives } from "./word-alternatives";

interface NotAWordProps {
  place: ResolvedPlace | undefined;
  placeCode: string;
  keyword: string;
  pageIndex: number;
}

// Le mot-clé n'est dans aucune page, souvent un début de mot (« retr »). Le
// bouton du formulaire annonçait alors les pages du lieu : on les montre,
// sous un avis qui propose les mots entiers qui commencent ainsi.
export async function NotAWord({
  place,
  placeCode,
  keyword,
  pageIndex,
}: NotAWordProps) {
  const placeHasPages = place !== undefined && place.pageCount > 0;
  const [suggestions, hits] = await Promise.all([
    suggestWords(keyword, place?.codes),
    placeHasPages ? listPages(place.codes, "", pageIndex) : [],
  ]);
  if (!placeHasPages && suggestions.length === 0) {
    return (
      <section aria-labelledby="results-title" className="fr-mt-6w">
        <h2 id="results-title" className={fr.cx("fr-h4")}>
          {resultsSummary(0, keyword, place?.displayName)}
        </h2>
        <NoPages />
      </section>
    );
  }
  return (
    <>
      <section aria-labelledby="word-notice-title" className="fr-mt-6w">
        <h2 id="word-notice-title" className={fr.cx("fr-h4")}>
          {notAWordTitle(keyword, place?.displayName)}
        </h2>
        <WordAlternatives
          suggestions={suggestions}
          placeCode={placeCode}
          keyword={keyword}
        />
      </section>
      {placeHasPages && (
        <section aria-labelledby="results-title" className="fr-mt-6w">
          <h2 id="results-title" className={fr.cx("fr-h4")}>
            {placePagesTitle(place.pageCount, place.displayName)}
          </h2>
          <HitList
            hits={hits}
            total={place.pageCount}
            pageIndex={pageIndex}
            highlight=""
            pageHref={(page) => pageSearchHref(placeCode, keyword, page)}
          />
        </section>
      )}
    </>
  );
}
