import Link from "next/link";
import { fr } from "@codegouvfr/react-dsfr";
import { Pagination } from "@codegouvfr/react-dsfr/Pagination";
import { RESULTS_PAGE_SIZE, type PageHit } from "@/lib/page-search/list-pages";
import { PageHitItem } from "./page-hit-item";

interface HitListProps {
  hits: PageHit[];
  total: number;
  pageIndex: number;
  // Mot surligné dans les extraits ; vide : début de page, sans surlignage.
  highlight: string;
  pageHref: (page: number) => string;
}

// Une page de résultats : 20 pages trouvées et la pagination DSFR.
export function HitList({
  hits,
  total,
  pageIndex,
  highlight,
  pageHref,
}: HitListProps) {
  const pageCount = Math.max(1, Math.ceil(total / RESULTS_PAGE_SIZE));
  if (hits.length === 0) {
    return (
      <p>
        Cette page de résultats n’existe pas.{" "}
        <Link href={pageHref(1)}>Revenir à la première page</Link>
      </p>
    );
  }
  return (
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
            keyword={highlight}
          />
        ))}
      </ol>
      {pageCount > 1 && (
        <Pagination
          className="fr-mt-4w"
          count={pageCount}
          defaultPage={pageIndex}
          getPageLinkProps={(page) => ({ href: pageHref(page) })}
        />
      )}
    </>
  );
}
