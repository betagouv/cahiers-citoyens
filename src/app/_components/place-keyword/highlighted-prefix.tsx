import { matchedPrefixLength } from "@/lib/page-search/highlight";

interface HighlightedPrefixProps {
  text: string;
  typed: string;
  normalize: (value: string) => string;
}

// Le début du texte qui correspond à la saisie, en gras, comme la maquette :
// « **Char**olles ». Le texte reste lu d'un seul tenant.
export function HighlightedPrefix({
  text,
  typed,
  normalize,
}: HighlightedPrefixProps) {
  const length = matchedPrefixLength(text, typed, normalize);
  if (length === 0) return text;
  return (
    <>
      <span className="font-bold">{text.slice(0, length)}</span>
      {text.slice(length)}
    </>
  );
}
