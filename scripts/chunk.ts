export const MIN_WORDS = 100;
export const MAX_WORDS = 400;

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function splitParagraph(paragraph: string): string[] {
  if (countWords(paragraph) <= MAX_WORDS) return [paragraph];
  const pieces: string[] = [];
  let current: string[] = [];
  let words = 0;
  for (const sentence of paragraph.split(/(?<=[.!?…])\s+/)) {
    const n = countWords(sentence);
    if (current.length > 0 && words + n > MAX_WORDS) {
      pieces.push(current.join(" "));
      current = [];
      words = 0;
    }
    current.push(sentence);
    words += n;
  }
  if (current.length > 0) pieces.push(current.join(" "));
  return pieces;
}

function groupWords(group: string[]): number {
  return group.reduce((total, unit) => total + countWords(unit), 0);
}

// Un dernier groupe trop court ne peut pas rejoindre le précédent sans dépasser
// MAX_WORDS (sinon le regroupement l'y aurait mis) : on déplace la coupure entre
// les deux plutôt que de les fusionner.
function rebalance(beforeLast: string[], last: string[]): string[][] {
  if (groupWords(last) >= MIN_WORDS) return [beforeLast, last];
  const units = [...beforeLast, ...last];
  let best = [beforeLast, last];
  for (let cut = 1; cut < units.length; cut++) {
    const left = units.slice(0, cut);
    const right = units.slice(cut);
    if (groupWords(left) > MAX_WORDS || groupWords(right) > MAX_WORDS) continue;
    if (
      Math.min(groupWords(left), groupWords(right)) >
      Math.min(...best.map(groupWords))
    ) {
      best = [left, right];
    }
  }
  return best;
}

// Une contribution par paragraphe, en-tête exclu (voir fake-data/transcription.ts).
export function chunkTranscription(transcription: string): string[] {
  const units = transcription
    .split(/\n\s*\n/)
    .slice(1)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap(splitParagraph);

  const groups: string[][] = [];
  let current: string[] = [];
  let words = 0;
  for (const unit of units) {
    const n = countWords(unit);
    if (current.length > 0 && words + n > MAX_WORDS) {
      groups.push(current);
      current = [];
      words = 0;
    }
    current.push(unit);
    words += n;
  }
  if (current.length > 0) groups.push(current);

  const last = groups.at(-1);
  const beforeLast = groups.at(-2);
  if (last && beforeLast) groups.splice(-2, 2, ...rebalance(beforeLast, last));
  return groups.map((g) => g.join("\n\n"));
}
