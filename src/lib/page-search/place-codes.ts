// Le paramètre `place` de `/search` : un code INSEE de commune (« 71106 »), ou
// un ou plusieurs codes de département séparés par des virgules (« 25 »,
// « 971,972,973,974,976 »), comme le produit `areaHref`.
export type PlaceCodes =
  | { kind: "departments"; codes: readonly string[] }
  | { kind: "municipality"; code: string };

// Départements de métropole, Corse et outre-mer (971 à 976), plus les
// collectivités d'outre-mer, qui ont des communes (975, 977, 978, 984…).
const DEPARTMENT_CODE = /^(\d{2}|2[AB]|9[78]\d)$/;
const MUNICIPALITY_CODE = /^(\d{5}|2[AB]\d{3})$/;
const MAX_DEPARTMENTS = 20;

export function parsePlaceCodes(value: string): PlaceCodes | undefined {
  const codes = [
    ...new Set(
      value
        .toUpperCase()
        .split(",")
        .map((code) => code.trim()),
    ),
  ];
  if (codes.length === 1 && MUNICIPALITY_CODE.test(codes[0])) {
    return { kind: "municipality", code: codes[0] };
  }
  if (
    codes.length > MAX_DEPARTMENTS ||
    !codes.every((code) => DEPARTMENT_CODE.test(code))
  ) {
    return undefined;
  }
  return { kind: "departments", codes };
}

export function formatPlaceCodes(place: PlaceCodes): string {
  return place.kind === "municipality" ? place.code : place.codes.join(",");
}

// Paramètre `place` facultatif d'une route : absent, valide, ou invalide.
export function parseOptionalPlace(
  value: string,
): PlaceCodes | undefined | "invalid" {
  if (value === "") return undefined;
  return parsePlaceCodes(value) ?? "invalid";
}
