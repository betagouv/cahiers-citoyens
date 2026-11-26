import type { TextSegment } from "@/lib/page-search/highlight";

// Les passages d'un texte, le mot cherché dans `mark` : l'élément dit « mot
// trouvé » aux aides techniques qui le lisent, le gras le montre sans
// dépendre de la couleur. Le texte prend la couleur du thème : le noir du
// navigateur disparaîtrait sur le fond du thème sombre. `firstId` nomme la
// première marque, cible du lien « Aller à la première occurrence ».
export function HighlightedText({
  segments,
  firstId,
}: {
  segments: readonly TextSegment[];
  firstId?: string;
}) {
  const first = segments.findIndex((segment) => segment.highlighted);
  return segments.map((segment, index) =>
    segment.highlighted ? (
      <mark
        key={index}
        id={index === first ? firstId : undefined}
        className="bg-[var(--background-contrast-yellow-tournesol)] font-bold text-[var(--text-title-grey)]"
      >
        {segment.text}
      </mark>
    ) : (
      segment.text
    ),
  );
}
