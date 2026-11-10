import { COMMUNES, precede } from "./communes";
import {
  THEME_IDS,
  type BanqueFragments,
  type Cahier,
  type Commune,
  type Contribution,
  type ThemeId,
} from "./domaine";
import type { Hasard } from "./hasard";
import { THEMES } from "./themes";

const MOTS_MIN = 40;
const MOTS_MAX = 200;
const DEBUT_OUVERTURES = Date.UTC(2018, 11, 1);
const JOURS_OUVERTURE = 90;

const FAUTES: readonly [RegExp, string][] = [
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

const PRENOMS = [
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
const QUALITES = [
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
const MAJUSCULES = "ABCDEFGHJLMNPRSTV";

function compterMots(texte: string): number {
  return texte.split(/\s+/).filter(Boolean).length;
}

function remplirGabarit(
  fragment: string,
  commune: Commune,
  hasard: Hasard,
): string {
  const avecPreposition = fragment.replace(
    /\b([Dd]e|[àÀ]) \{commune\}/g,
    (_, prep: string) => {
      const groupe = precede(
        prep.toLowerCase() === "de" ? "de" : "à",
        commune.nom,
      );
      return prep === prep.toLowerCase()
        ? groupe
        : groupe[0].toUpperCase() + groupe.slice(1);
    },
  );
  return avecPreposition.replace(/\{(\w+)\}/g, (_, cle: string) => {
    switch (cle) {
      case "commune":
        return commune.nom;
      case "km":
        return String(hasard.entier(8, 70));
      case "euros":
        return String(hasard.entier(3, 90) * 10);
      case "annees":
        return String(hasard.entier(3, 35));
      case "mois":
        return String(hasard.entier(2, 14));
      default:
        throw new Error(`gabarit inconnu : {${cle}} dans « ${fragment} »`);
    }
  });
}

function composerTexte(
  banque: BanqueFragments,
  commune: Commune,
  hasard: Hasard,
): string {
  const cible = hasard.entier(MOTS_MIN, MOTS_MAX);
  const piles = {
    constats: hasard.melange(banque.constats),
    exemples: hasard.melange(banque.exemples),
    revendications: hasard.melange(banque.revendications),
  };
  const phrases: string[] = [];
  let mots = 0;
  function ajouter(fragment: string | undefined): void {
    if (fragment === undefined) return;
    const phrase = remplirGabarit(fragment, commune, hasard);
    const n = compterMots(phrase);
    if (mots + n > MOTS_MAX) return;
    phrases.push(phrase);
    mots += n;
  }

  if (hasard.probabilite(0.85)) ajouter(hasard.choix(banque.ouvertures));
  ajouter(piles.constats.pop());
  if (hasard.probabilite(0.6)) ajouter(piles.exemples.pop());
  ajouter(piles.revendications.pop());
  const categories = ["constats", "exemples", "revendications"] as const;
  for (
    let essais = 0;
    (mots < cible || mots < MOTS_MIN) && essais < 12;
    essais++
  ) {
    ajouter(piles[hasard.choix(categories)].pop());
  }
  if (hasard.probabilite(0.65)) ajouter(hasard.choix(banque.conclusions));

  let texte = phrases.join(" ");
  if (hasard.probabilite(0.3)) {
    const [motif, faute] = hasard.choix(FAUTES);
    texte = texte.replace(motif, faute);
  }
  return texte;
}

function signer(hasard: Hasard): string | null {
  function initiale(): string {
    return hasard.choix([...MAJUSCULES]);
  }
  const formes = [
    () => `${hasard.choix(["Mme", "M."])} ${initiale()}.`,
    () => `${initiale()}.${initiale()}.`,
    () => `${hasard.choix(PRENOMS)} ${initiale()}.`,
    () => `${hasard.choix(PRENOMS)}, ${hasard.entier(19, 88)} ans`,
    () => hasard.choix(QUALITES),
    () => `Famille ${initiale()}.`,
  ];
  return hasard.probabilite(0.3) ? null : hasard.choix(formes)();
}

function choisirThemes(n: number, hasard: Hasard): ThemeId[] {
  const dominants = hasard.melange(THEME_IDS).slice(0, 2);
  const urne = [...THEME_IDS, ...dominants, ...dominants, ...dominants];
  return Array.from({ length: n }, () => hasard.choix(urne));
}

export function composerCahier(numero: number, hasard: Hasard): Cahier {
  const commune = hasard.choix(COMMUNES);
  const jour = new Date(
    DEBUT_OUVERTURES + hasard.entier(0, JOURS_OUVERTURE - 1) * 86_400_000,
  );
  const themes = choisirThemes(hasard.entier(3, 15), hasard);
  const contributions: Contribution[] = themes.map((theme, i) => ({
    ordre: i + 1,
    theme,
    texte: composerTexte(THEMES[theme].fragments, commune, hasard),
    signature: signer(hasard),
  }));
  return {
    id: `cahier-${String(numero).padStart(4, "0")}`,
    commune,
    dateOuverture: jour.toISOString().slice(0, 10),
    contributions,
  };
}
