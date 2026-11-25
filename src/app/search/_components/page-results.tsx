import Link from "next/link";
import { fr } from "@codegouvfr/react-dsfr";
import { Pagination } from "@codegouvfr/react-dsfr/Pagination";
import { countPages } from "@/lib/page-search/count-pages";
import type { ResolvedPlace } from "@/lib/page-search/find-place";
import { RESULTS_PAGE_SIZE, listPages } from "@/lib/page-search/list-pages";
import { formatPlaceCodes } from "@/lib/page-search/place-codes";
import { resultsSummary } from "@/lib/page-search/results-summary";
import { pageSearchHref } from "@/lib/page-search/search-params";
import { PageHitItem } from "./page-hit-item";
import { WordAlternatives } from "./word-alternatives";

interface PageResultsProps {
  place: ResolvedPlace | undefined;
  keyword: string;
  pageIndex: number;
}

interface NoPagesProps {
  place: ResolvedPlace | undefined;
  placeCode: string;
  keyword: string;
}

// Aucune page : des mots entiers si le mot-clé n'en est que le début, puis
// pourquoi un lieu peut n'avoir rien en ligne.
function NoPages({ place, placeCode, keyword }: NoPagesProps) {
  return (
    <>
      {keyword !== "" && (
        <WordAlternatives
          place={place?.codes}
          placeCode={placeCode}
          keyword={keyword}
        />
      )}
      <p>
        Les cahiers sont publiés progressivement : certaines communes n’en ont
        pas encore en ligne. La recherche trouve les mots tels qu’ils sont
        écrits : essayez une autre forme du mot, au pluriel ou avec un accent.{" "}
        <Link className={fr.cx("fr-link")} href="/publication">
          Voir l’état de publication
        </Link>
      </p>
    </>
  );
}

// Les pages publiées du lieu qui contiennent le mot-clé, 20 par page de
// résultats. Le total et la liste partagent leur filtre (`publishedIn`) et
// partent en parallèle.
export async function PageResults({
  place,
  keyword,
  pageIndex,
}: PageResultsProps) {
  const [total, hits] = await Promise.all([
    countPages(place?.codes, keyword),
    listPages(place?.codes, keyword, pageIndex),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / RESULTS_PAGE_SIZE));
  const placeCode = place === undefined ? "" : formatPlaceCodes(place.codes);
  return (
    <section aria-labelledby="results-title" className="fr-mt-6w">
      <h2 id="results-title" className={fr.cx("fr-h4")}>
        {resultsSummary(total, keyword, place?.label)}
      </h2>
      {total === 0 && (
        <NoPages place={place} placeCode={placeCode} keyword={keyword} />
      )}
      {total > 0 && hits.length === 0 && (
        <p>
          Cette page de résultats n’existe pas.{" "}
          <Link href={pageSearchHref(placeCode, keyword, 1)}>
            Revenir à la première page
          </Link>
        </p>
      )}
      {hits.length > 0 && (
        <>
          {pageCount > 1 && (
            <p className={fr.cx("fr-text--sm")}>
              Page {pageIndex} sur {pageCount}
            </p>
          )}
          <ol className="fr-raw-list">
            {hits.map((hit) => (
              <PageHitItem
                key={`${hit.notebookId}-${hit.number}`}
                hit={hit}
                keyword={keyword}
              />
            ))}
          </ol>
          {pageCount > 1 && (
            <Pagination
              className="fr-mt-4w"
              count={pageCount}
              defaultPage={pageIndex}
              getPageLinkProps={(page) => ({
                href: pageSearchHref(placeCode, keyword, page),
              })}
            />
          )}
        </>
      )}
    </section>
  );
}
