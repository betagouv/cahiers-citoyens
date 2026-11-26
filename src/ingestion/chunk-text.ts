export const MAX_WORDS = 400;

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// Coupe entre deux phrases dès que le morceau dépasserait MAX_WORDS. Une
// phrase seule plus longue reste entière.
export function splitContribution(contribution: string): string[] {
  if (countWords(contribution) <= MAX_WORDS) return [contribution];
  const pieces: string[] = [];
  let current: string[] = [];
  let words = 0;
  for (const sentence of contribution.split(/(?<=[.!?…])\s+/)) {
    const n = countWords(sentence);
    if (current.length > 0 && words + n > MAX_WORDS) {
      pieces.push(current.join(" "));
      current = [];
      words = 0;
    }
    current.push(sentence);
    words += n;
  }
  // La boucle se termine toujours sur un morceau non vide : la contribution
  // dépasse MAX_WORDS, donc compte au moins une phrase.
  pieces.push(current.join(" "));
  return pieces;
}
