import { fr } from "@codegouvfr/react-dsfr";
import { countPages } from "@/lib/page-search/count-pages";
import type { ResolvedPlace } from "@/lib/page-search/find-place";
import { listPages } from "@/lib/page-search/list-pages";
import { formatPlaceCodes } from "@/lib/page-search/place-codes";
import { resultsSummary } from "@/lib/page-search/results-summary";
import { pageSearchHref } from "@/lib/page-search/search-params";
import { HitList } from "./hit-list";
import { NoPages } from "./no-pages";
import { NotAWord } from "./not-a-word";

interface PageResultsProps {
  place: ResolvedPlace | undefined;
  keyword: string;
  pageIndex: number;
}

// Les pages publiées du lieu qui contiennent le mot-clé, 20 par page de
// résultats. Le total et la liste partagent leur filtre (`publishedIn`) et
// partent en parallèle. Un mot-clé sans page passe la main à `NotAWord`.
export async function PageResults({
  place,
  keyword,
  pageIndex,
}: PageResultsProps) {
  const [total, hits] = await Promise.all([
    countPages(place?.codes, keyword),
    listPages(place?.codes, keyword, pageIndex),
  ]);
  const placeCode = place === undefined ? "" : formatPlaceCodes(place.codes);
  if (total === 0 && keyword !== "") {
    return (
      <NotAWord
        place={place}
        placeCode={placeCode}
        keyword={keyword}
        pageIndex={pageIndex}
      />
    );
  }
  return (
    <section aria-labelledby="results-title" className="fr-mt-6w">
      <h2 id="results-title" className={fr.cx("fr-h4")}>
        {resultsSummary(total, keyword, place?.displayName)}
      </h2>
      {total === 0 ? (
        <NoPages />
      ) : (
        <HitList
          hits={hits}
          total={total}
          pageIndex={pageIndex}
          highlight={keyword}
          pageHref={(page) => pageSearchHref(placeCode, keyword, page)}
        />
      )}
    </section>
  );
}
