export const THEME_IDS = [
  "taxes",
  "publicServices",
  "transport",
  "health",
  "ecology",
  "democracy",
  "agriculture",
  "education",
  "pensions",
  "housing",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export interface Municipality {
  name: string;
  inseeCode: string;
  department: string;
  region: string;
}

export interface Contribution {
  position: number;
  theme: ThemeId;
  text: string;
  signature: string | null;
}

export interface Notebook {
  id: string;
  municipality: Municipality;
  openedOn: string;
  contributions: Contribution[];
}

export interface FragmentBank {
  openings: readonly string[];
  findings: readonly string[];
  demands: readonly string[];
  examples: readonly string[];
  conclusions: readonly string[];
}

export interface Theme {
  label: string;
  fragments: FragmentBank;
}

export interface ManifestLine {
  id: string;
  municipality: Municipality;
  openedOn: string;
  contributions: { position: number; theme: ThemeId }[];
}

export function toManifestLine(notebook: Notebook): ManifestLine {
  return {
    id: notebook.id,
    municipality: notebook.municipality,
    openedOn: notebook.openedOn,
    contributions: notebook.contributions.map(({ position, theme }) => ({
      position,
      theme,
    })),
  };
}
