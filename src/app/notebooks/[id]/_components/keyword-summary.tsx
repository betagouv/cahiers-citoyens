import { formatNumber } from "@/lib/format";

export const FIRST_OCCURRENCE_ID = "first-occurrence";

function plural(count: number, word: string): string {
  return `${formatNumber(count)} ${word}${count > 1 ? "s" : ""}`;
}

// Annonce, avant les pages, ce que le surlignage montre à l'œil : combien de
// fois le mot cherché apparaît, et un lien vers sa première occurrence.
export function KeywordSummary({
  keyword,
  occurrences,
  pages,
}: {
  keyword: string;
  occurrences: number;
  pages: number;
}) {
  if (occurrences === 0) {
    return (
      <p className="fr-highlight fr-mb-4w">
        Aucune occurrence de « {keyword} » dans ce cahier.
      </p>
    );
  }
  return (
    <div className="fr-highlight fr-mb-4w">
      <p className="fr-mb-1w">
        {plural(occurrences, "occurrence")} de « {keyword} »{" "}
        {occurrences > 1 ? "surlignées" : "surlignée"} dans ce cahier, sur{" "}
        {plural(pages, "page")}.
      </p>
      <p className="fr-mb-0">
        <a className="fr-link" href={`#${FIRST_OCCURRENCE_ID}`}>
          Aller à la première occurrence
        </a>
      </p>
    </div>
  );
}
