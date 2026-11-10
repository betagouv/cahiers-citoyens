export const THEME_IDS = [
  "fiscalite",
  "services-publics",
  "transports",
  "sante",
  "ecologie",
  "democratie",
  "agriculture",
  "education",
  "retraites",
  "logement",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export interface Commune {
  nom: string;
  codeInsee: string;
  departement: string;
  region: string;
}

export interface Contribution {
  ordre: number;
  theme: ThemeId;
  texte: string;
  signature: string | null;
}

export interface Cahier {
  id: string;
  commune: Commune;
  dateOuverture: string;
  contributions: Contribution[];
}

export interface BanqueFragments {
  ouvertures: readonly string[];
  constats: readonly string[];
  revendications: readonly string[];
  exemples: readonly string[];
  conclusions: readonly string[];
}

export interface Theme {
  libelle: string;
  fragments: BanqueFragments;
}

export interface LigneManifeste {
  id: string;
  commune: Commune;
  dateOuverture: string;
  contributions: { ordre: number; theme: ThemeId }[];
}

export function versLigneManifeste(cahier: Cahier): LigneManifeste {
  return {
    id: cahier.id,
    commune: cahier.commune,
    dateOuverture: cahier.dateOuverture,
    contributions: cahier.contributions.map(({ ordre, theme }) => ({
      ordre,
      theme,
    })),
  };
}
