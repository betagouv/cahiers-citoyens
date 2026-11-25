// Chaque défaut casse un seul contrôle de la section 4 du protocole.
export const DEFECTS = [
  "missing-image",
  "unlisted-file",
  "duplicate-page",
  "decreasing-pages",
  "invalid-page-id",
  "notebook-id-mismatch",
  "invalid-image",
  "invalid-json",
  "schema-violation",
  "path-traversal",
  "nested-folder",
] as const;

export type Defect = (typeof DEFECTS)[number];

export function isDefect(value: string): value is Defect {
  return DEFECTS.some((defect) => defect === value);
}
