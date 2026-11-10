import {
  THEME_IDS,
  type Contribution,
  type FragmentBank,
  type Municipality,
  type Notebook,
  type ThemeId,
} from "./domain";
import { MUNICIPALITIES, withPreposition } from "./municipalities";
import type { Random } from "./random";
import { THEMES } from "./themes";

const MIN_WORDS = 40;
const MAX_WORDS = 200;
const FIRST_OPENING = Date.UTC(2018, 11, 1);
const OPENING_DAYS = 90;

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

const FIRST_NAMES = [
  "Nadine",
  "Gérard",
  "Sylvie",
  "Jean-Marc",
  "Josiane",
  "Didier",
  "Maëlle",
  "Kévin",
  "Odile",
  "Thierry",
  "Yvette",
  "Karim",
  "Ghislaine",
  "Lucien",
  "Soraya",
  "Fabrice",
];
const SELF_DESCRIPTIONS = [
  "Une retraitée",
  "Un agriculteur",
  "Une mère de famille",
  "Un artisan",
  "Une infirmière",
  "Un habitant du bourg",
  "Une étudiante",
  "Un ancien du village",
  "Une aide-soignante",
];
const INITIALS = "ABCDEFGHJLMNPRSTV";

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function fillTemplate(
  fragment: string,
  municipality: Municipality,
  random: Random,
): string {
  const withPrepositions = fragment.replace(
    /\b([Dd]e|[àÀ]) \{municipality\}/g,
    (_, prep: string) => {
      const group = withPreposition(
        prep.toLowerCase() === "de" ? "de" : "à",
        municipality.name,
      );
      return prep === prep.toLowerCase()
        ? group
        : group[0].toUpperCase() + group.slice(1);
    },
  );
  return withPrepositions.replace(/\{(\w+)\}/g, (_, key: string) => {
    switch (key) {
      case "municipality":
        return municipality.name;
      case "km":
        return String(random.int(8, 70));
      case "euros":
        return String(random.int(3, 90) * 10);
      case "years":
        return String(random.int(3, 35));
      case "months":
        return String(random.int(2, 14));
      default:
        throw new Error(`gabarit inconnu : {${key}} dans « ${fragment} »`);
    }
  });
}

function composeText(
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

function sign(random: Random): string | null {
  function initial(): string {
    return random.pick([...INITIALS]);
  }
  const forms = [
    () => `${random.pick(["Mme", "M."])} ${initial()}.`,
    () => `${initial()}.${initial()}.`,
    () => `${random.pick(FIRST_NAMES)} ${initial()}.`,
    () => `${random.pick(FIRST_NAMES)}, ${random.int(19, 88)} ans`,
    () => random.pick(SELF_DESCRIPTIONS),
    () => `Famille ${initial()}.`,
  ];
  return random.chance(0.3) ? null : random.pick(forms)();
}

function pickThemes(n: number, random: Random): ThemeId[] {
  const dominant = random.shuffle(THEME_IDS).slice(0, 2);
  const urn = [...THEME_IDS, ...dominant, ...dominant, ...dominant];
  return Array.from({ length: n }, () => random.pick(urn));
}

export function composeNotebook(index: number, random: Random): Notebook {
  const municipality = random.pick(MUNICIPALITIES);
  const day = new Date(
    FIRST_OPENING + random.int(0, OPENING_DAYS - 1) * 86_400_000,
  );
  const themes = pickThemes(random.int(3, 15), random);
  const contributions: Contribution[] = themes.map((theme, i) => ({
    position: i + 1,
    theme,
    text: composeText(THEMES[theme].fragments, municipality, random),
    signature: sign(random),
  }));
  return {
    id: `notebook-${String(index).padStart(4, "0")}`,
    municipality,
    openedOn: day.toISOString().slice(0, 10),
    contributions,
  };
}
