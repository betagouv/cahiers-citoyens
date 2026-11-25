import Link from "next/link";
import { fr } from "@codegouvfr/react-dsfr";
import { excerpt } from "@/lib/format";
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
  return splitHighlights(text).map((segment, index) =>
    segment.highlighted ? (
      // `mark` dit « mot trouvé » aux aides techniques ; le gras le montre
      // sans dépendre de la couleur.
      <mark
        key={index}
        className="bg-[var(--background-contrast-yellow-tournesol)] font-bold"
      >
        {segment.text}
      </mark>
    ) : (
      segment.text
    ),
  );
}

// Une page trouvée : sa commune et son numéro, le cahier, un extrait.
export function PageHitItem({
  hit,
  keyword,
}: {
  hit: PageHit;
  keyword: string;
}) {
  const place =
    hit.municipalityName === null
      ? "Commune non renseignée"
      : `${hit.municipalityName}${hit.departmentCode === null ? "" : ` (${hit.departmentCode})`}`;
  return (
    <li className="fr-py-3w border-b border-[var(--border-default-grey)]">
      <h3 className={fr.cx("fr-h6", "fr-mb-1v")}>
        <Link href={`/notebooks/${encodeURIComponent(hit.notebookId)}`}>
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
