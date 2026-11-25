import {
  THEME_IDS,
  type Contribution,
  type Notebook,
  type ThemeId,
} from "./domain";
import { composeText } from "./compose-text";
import { MUNICIPALITIES } from "./municipalities";
import type { Random } from "./random";
import { THEMES } from "./themes";

const FIRST_OPENING = Date.UTC(2018, 11, 1);
const OPENING_DAYS = 90;

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
