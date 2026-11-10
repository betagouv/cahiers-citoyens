export type AnswerSegment =
  { kind: "text"; text: string } | { kind: "citation"; number: number };

// Découpe la réponse en texte et en renvois aux sources. Reconnaît `[2]` et
// `[1, 3]` ; un numéro hors de 1..sourceCount reste du texte.
export function splitCitations(
  answer: string,
  sourceCount: number,
): AnswerSegment[] {
  const segments: AnswerSegment[] = [];
  function pushText(text: string) {
    if (text === "") return;
    const last = segments.at(-1);
    if (last?.kind === "text") last.text += text;
    else segments.push({ kind: "text", text });
  }
  let cursor = 0;
  for (const match of answer.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)) {
    const numbers = match[1].split(",").map((part) => Number(part.trim()));
    const valid = numbers.every((n) => n >= 1 && n <= sourceCount);
    pushText(answer.slice(cursor, match.index));
    if (valid) {
      for (const number of numbers) segments.push({ kind: "citation", number });
    } else {
      pushText(match[0]);
    }
    cursor = match.index + match[0].length;
  }
  pushText(answer.slice(cursor));
  return segments;
}
