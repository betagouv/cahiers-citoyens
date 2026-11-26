import Image from "next/image";
import { pageAnchor, pageImageSrc } from "@/lib/notebook-links";
import type { PageContent } from "@/lib/notebooks";

// Une page du cahier : son image et sa transcription côte à côte, l'une sous
// l'autre sous 768 px. L'ancre `#page-<n>` sert aux citations de la recherche.
export function NotebookPageItem({
  notebookId,
  version,
  page,
  first,
}: {
  notebookId: string;
  version: number;
  page: PageContent;
  // La première image est la plus grande du premier écran : chargée tout de
  // suite. Les suivantes attendent le défilement.
  first: boolean;
}) {
  const anchor = pageAnchor(page.number);
  const src = pageImageSrc(notebookId, page.number, version);
  return (
    <section
      id={anchor}
      aria-labelledby={`${anchor}-title`}
      className="fr-pt-4w fr-pb-2w border-t border-[var(--border-default-grey)]"
    >
      <h2 id={`${anchor}-title`} className="fr-h4">
        Page {page.number}
      </h2>
      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-md-6">
          <Image
            src={src}
            alt={`Image numérisée de la page ${page.number}, transcrite à la suite`}
            width={page.width}
            height={page.height}
            sizes="(min-width: 768px) 50vw, 100vw"
            loading={first ? "eager" : "lazy"}
            fetchPriority={first ? "high" : "auto"}
            unoptimized
            className="block h-auto w-full border border-[var(--border-default-grey)]"
          />
          <p className="fr-text--sm fr-mt-1w fr-mb-0">
            <a href={src} className="fr-link fr-link--sm">
              Ouvrir l&apos;image de la page {page.number} en grand
            </a>
          </p>
        </div>
        <div className="fr-col-12 fr-col-md-6">
          {page.text === "" ? (
            <p className="text-[var(--text-mention-grey)]">
              Aucun texte transcrit sur cette page.
            </p>
          ) : (
            <p className="whitespace-pre-line">{page.text}</p>
          )}
        </div>
      </div>
    </section>
  );
}
