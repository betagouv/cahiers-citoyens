import type { FragmentBank, Municipality } from "./domain";
import type { Random } from "./random";
import { fillTemplate } from "./template";

export const MIN_WORDS = 40;
export const MAX_WORDS = 200;
const TYPOS: readonly [RegExp, string][] = [
  [/\bà\b/, "a"],
  [/\bça\b/, "ca"],
  [/\bdéjà\b/, "deja"],
  [/\btrès\b/, "tres"],
  [/\bmême\b/, "meme"],
  [/\bleurs\b/, "leur"],
  [/\bêtre\b/, "etre"],
  [/\bproblème\b/, "probleme"],
  [/\bnous sommes\b/, "nous somme"],
];

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function composeText(
  bank: FragmentBank,
  municipality: Municipality,
  random: Random,
): string {
  const target = random.int(MIN_WORDS, MAX_WORDS);
  const piles = {
    findings: random.shuffle(bank.findings),
    examples: random.shuffle(bank.examples),
    demands: random.shuffle(bank.demands),
  };
  const sentences: string[] = [];
  let words = 0;
  function add(fragment: string | undefined): void {
    if (fragment === undefined) return;
    const sentence = fillTemplate(fragment, municipality, random);
    const n = countWords(sentence);
    if (words + n > MAX_WORDS) return;
    sentences.push(sentence);
    words += n;
  }

  if (random.chance(0.85)) add(random.pick(bank.openings));
  add(piles.findings.pop());
  if (random.chance(0.6)) add(piles.examples.pop());
  add(piles.demands.pop());
  const categories = ["findings", "examples", "demands"] as const;
  for (
    let attempts = 0;
    (words < target || words < MIN_WORDS) && attempts < 12;
    attempts++
  ) {
    add(piles[random.pick(categories)].pop());
  }
  if (random.chance(0.65)) add(random.pick(bank.conclusions));

  let text = sentences.join(" ");
  if (random.chance(0.3)) {
    const [pattern, typo] = random.pick(TYPOS);
    text = text.replace(pattern, typo);
  }
  return text;
}
