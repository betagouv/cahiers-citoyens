import type { TextSegment } from "./highlight";

// Un mot au sens de l'analyseur de Postgres : une suite de lettres et de
// chiffres. Apostrophes, tirets, espaces et ponctuation séparent les mots.
const WORD = /[\p{L}\p{N}]+/gu;

// Les mots du mot-clé, en minuscules, tels que les cherche la recherche par
// lieu et mot-clé (`containsKeyword` : configuration `simple`, sans
// racinisation ni repli des accents). La casse est ignorée, les accents non :
// « Impôt » trouve « impôt », mais ni « impot » ni « impôts ».
export function keywordWords(keyword: string): ReadonlySet<string> {
  return new Set(keyword.toLowerCase().match(WORD));
}

// Découpe `text` en passages, mot du mot-clé ou non. Seul un mot entier est
// surligné : « retraite » ne marque rien dans « retraites ». Le surlignage
// suit ainsi `ts_headline` de l'extrait des résultats.
export function splitKeyword(
  text: string,
  words: ReadonlySet<string>,
): TextSegment[] {
  if (words.size === 0)
    return text === "" ? [] : [{ text, highlighted: false }];
  const segments: TextSegment[] = [];
  let start = 0;
  for (const match of text.matchAll(WORD)) {
    if (!words.has(match[0].toLowerCase())) continue;
    if (match.index > start) {
      segments.push({
        text: text.slice(start, match.index),
        highlighted: false,
      });
    }
    segments.push({ text: match[0], highlighted: true });
    start = match.index + match[0].length;
  }
  if (start < text.length) {
    segments.push({ text: text.slice(start), highlighted: false });
  }
  return segments;
}

// Le texte contient-il au moins un mot du mot-clé ?
export function containsAnyWord(
  text: string,
  words: ReadonlySet<string>,
): boolean {
  return splitKeyword(text, words).some((segment) => segment.highlighted);
}
