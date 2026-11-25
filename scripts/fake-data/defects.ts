export const DEFECTS = [
  "missing-image",
  "unlisted-file",
  "page-gap",
  "duplicate-page",
  "invalid-png",
  "invalid-json",
  "schema-violation",
  "path-traversal",
  "nested-folder",
] as const;

export type Defect = (typeof DEFECTS)[number];

export function isDefect(value: string): value is Defect {
  return DEFECTS.some((defect) => defect === value);
}
