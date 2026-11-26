import { HighlightedText } from "@/app/_components/highlighted-text";
import { pageAnchor, pageImageSrc } from "@/lib/notebook-links";
import type { PageContent } from "@/lib/notebooks";
import type { TextSegment } from "@/lib/page-search/highlight";
import { PageScan } from "./page-scan";

// Une page du cahier : son image et sa transcription côte à côte, l'une sous
// l'autre sous 768 px. L'ancre `#page-<n>` sert aux citations de la recherche.
// Le mot cherché est surligné dans le texte (`segments`) et, quand ses lignes
// sont connues, sur l'image (`lines`).
export function NotebookPageItem({
  notebookId,
  version,
  page,
  first,
  segments,
  firstOccurrenceId,
  lines,
}: {
  notebookId: string;
  version: number;
  page: PageContent;
  first: boolean;
  segments: readonly TextSegment[];
  // Posé sur la première marque de la page qui porte la première occurrence.
  firstOccurrenceId?: string;
  lines: readonly string[];
}) {
  const anchor = pageAnchor(page.number);
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
          <PageScan
            src={pageImageSrc(notebookId, page.number, version)}
            page={page}
            first={first}
            lines={lines}
          />
        </div>
        <div className="fr-col-12 fr-col-md-6">
          {page.text === "" ? (
            <p className="text-[var(--text-mention-grey)]">
              Aucun texte transcrit sur cette page.
            </p>
          ) : (
            <p className="whitespace-pre-line">
              <HighlightedText
                segments={segments}
                firstId={firstOccurrenceId}
              />
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
