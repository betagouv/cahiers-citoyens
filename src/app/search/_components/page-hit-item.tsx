import Link from "next/link";
import { fr } from "@codegouvfr/react-dsfr";
import { HighlightedText } from "@/app/_components/highlighted-text";
import { excerpt } from "@/lib/format";
import { notebookHref } from "@/lib/notebook-links";
import { notebookPlaceLabel } from "@/lib/notebook-place";
import { splitHighlights } from "@/lib/page-search/highlight";
import type { PageHit } from "@/lib/page-search/list-pages";

const EXCERPT_LENGTH = 300;

function Excerpt({
  text,
  highlighted,
}: {
  text: string;
  highlighted: boolean;
}) {
  if (!highlighted) return excerpt(text, EXCERPT_LENGTH);
  return <HighlightedText segments={splitHighlights(text)} />;
}

// Une page trouvée : sa commune et son numéro, le cahier, un extrait.
export function PageHitItem({
  hit,
  keyword,
}: {
  hit: PageHit;
  keyword: string;
}) {
  const place = notebookPlaceLabel(hit) ?? "Commune non renseignée";
  return (
    <li className="fr-py-3w border-b border-[var(--border-default-grey)]">
      <h3 className={fr.cx("fr-h6", "fr-mb-1v")}>
        <Link href={notebookHref(hit.notebookId, hit.number, keyword)}>
          {place}, page {hit.number}
        </Link>
      </h3>
      <p
        className={`${fr.cx("fr-text--sm", "fr-mb-1w")} text-[var(--text-mention-grey)]`}
      >
        Cahier {hit.notebookId}
      </p>
      <p className={fr.cx("fr-mb-0")}>
        <Excerpt text={hit.excerpt} highlighted={keyword !== ""} />
      </p>
    </li>
  );
}
