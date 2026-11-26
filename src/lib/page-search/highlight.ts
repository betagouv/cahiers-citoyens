import { HIGHLIGHT_END, HIGHLIGHT_START } from "./highlight-markers";

export interface TextSegment {
  text: string;
  highlighted: boolean;
}

// Nombre de caractères de `text` qui couvrent la saisie `typed`, comparés une
// fois normalisés : « Char » couvre les 4 premiers de « Charolles », « retr »
// ceux de « rétrocession ». 0 si `text` ne commence pas par la saisie.
export function matchedPrefixLength(
  text: string,
  typed: string,
  normalize: (value: string) => string,
): number {
  const target = normalize(typed);
  if (target === "" || !normalize(text).startsWith(target)) return 0;
  let end = 1;
  while (normalize(text.slice(0, end)).length < target.length) end += 1;
  return end;
}

// Découpe un extrait de `ts_headline` en passages, mot trouvé ou non.
export function splitHighlights(excerpt: string): TextSegment[] {
  return excerpt
    .split(HIGHLIGHT_START)
    .flatMap((part, index) => {
      if (index === 0) return [{ text: part, highlighted: false }];
      const end = part.indexOf(HIGHLIGHT_END);
      if (end === -1) return [{ text: part, highlighted: false }];
      return [
        { text: part.slice(0, end), highlighted: true },
        { text: part.slice(end + HIGHLIGHT_END.length), highlighted: false },
      ];
    })
    .filter((segment) => segment.text !== "");
}
