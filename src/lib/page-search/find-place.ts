import { eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import {
  departments,
  municipalities,
  municipalityCodeHistory,
  placePageCounts,
} from "@/db/schema";
import { type PlaceCodes, parsePlaceCodes } from "./place-codes";
import {
  type PlaceSuggestion,
  formerMunicipalityName,
  placeDisplayName,
  placeLabel,
} from "./place-label";
import { suggestPlaces } from "./suggest-places";

// Un lieu reconnu : ses codes pour filtrer, son étiquette pour le champ
// « Lieu », son nom pour les titres, et son nombre de pages publiées.
export interface ResolvedPlace {
  codes: PlaceCodes;
  // « Béon (01) » : le texte du champ, que la recherche sans JavaScript
  // reconnaît.
  label: string;
  // « Béon (ancienne commune, aujourd’hui Culoz-Béon) » ; l'étiquette pour
  // tout autre lieu.
  displayName: string;
  pageCount: number;
}

export type PlaceResolution =
  | { status: "none" }
  | { status: "found"; place: ResolvedPlace }
  | { status: "unknown"; input: string };

const pageCount = sql<number>`coalesce(${placePageCounts.pageCount}, 0)`;

async function findDepartments(
  codes: readonly string[],
): Promise<ResolvedPlace | undefined> {
  const rows = await getDatabase()
    .select({ code: departments.code, name: departments.name, pageCount })
    .from(departments)
    .leftJoin(placePageCounts, eq(placePageCounts.place, departments.code))
    .where(inArray(departments.code, [...codes]));
  // Dans l'ordre de l'URL, comme les étiquettes de l'accueil.
  const found = codes.flatMap((code) =>
    rows.filter((row) => row.code === code),
  );
  if (found.length === 0) return undefined;
  const label =
    found.length === 1
      ? placeLabel({ name: found[0].name, departmentCode: found[0].code })
      : found.map((row) => row.name).join(", ");
  return {
    codes: { kind: "departments", codes: found.map((row) => row.code) },
    label,
    displayName: label,
    pageCount: found.reduce((sum, row) => sum + row.pageCount, 0),
  };
}

// Un code de 2019 disparu depuis : l'ancienne commune, et ses seules pages
// (`publishedIn` ne retient pour ce code que les cahiers qui le portent).
async function findFormerMunicipality(
  code: string,
): Promise<ResolvedPlace | undefined> {
  const [row] = await getDatabase()
    .select({
      name: municipalityCodeHistory.name,
      departmentCode: municipalityCodeHistory.departmentCode,
      currentName: municipalities.name,
      pageCount,
    })
    .from(municipalityCodeHistory)
    .innerJoin(
      municipalities,
      eq(municipalities.inseeCode, municipalityCodeHistory.currentCode),
    )
    .leftJoin(
      placePageCounts,
      eq(placePageCounts.place, municipalityCodeHistory.oldCode),
    )
    .where(eq(municipalityCodeHistory.oldCode, code));
  if (row === undefined) return undefined;
  return {
    codes: { kind: "municipality", code },
    label: placeLabel(row),
    displayName: formerMunicipalityName(row),
    pageCount: row.pageCount,
  };
}

async function findCurrentMunicipality(
  code: string,
): Promise<ResolvedPlace | undefined> {
  const [row] = await getDatabase()
    .select({
      name: municipalities.name,
      departmentCode: municipalities.departmentCode,
      pageCount,
    })
    .from(municipalities)
    .leftJoin(
      placePageCounts,
      eq(placePageCounts.place, municipalities.inseeCode),
    )
    .where(eq(municipalities.inseeCode, code));
  if (row === undefined) return undefined;
  const label = placeLabel(row);
  return {
    codes: { kind: "municipality", code },
    label,
    displayName: label,
    pageCount: row.pageCount,
  };
}

async function findMunicipality(
  code: string,
): Promise<ResolvedPlace | undefined> {
  return (await findFormerMunicipality(code)) ?? findCurrentMunicipality(code);
}

function fromSuggestion(suggestion: PlaceSuggestion): ResolvedPlace {
  return {
    codes:
      suggestion.kind === "department"
        ? { kind: "departments", codes: [suggestion.code] }
        : { kind: "municipality", code: suggestion.code },
    label: placeLabel(suggestion),
    displayName: placeDisplayName(suggestion),
    pageCount: suggestion.pageCount,
  };
}

export function findPlace(
  codes: PlaceCodes,
): Promise<ResolvedPlace | undefined> {
  return codes.kind === "departments"
    ? findDepartments(codes.codes)
    : findMunicipality(codes.code);
}

// Le paramètre `place` de `/search` : des codes (formulaire avec JavaScript,
// étiquettes de l'accueil), ou le texte saisi (formulaire sans JavaScript),
// qui prend alors la première suggestion.
export async function resolvePlace(value: string): Promise<PlaceResolution> {
  const input = value.trim();
  if (input === "") return { status: "none" };
  const codes = parsePlaceCodes(input);
  if (codes !== undefined) {
    const place = await findPlace(codes);
    return place === undefined
      ? { status: "unknown", input }
      : { status: "found", place };
  }
  const [first] = await suggestPlaces(input);
  if (first === undefined) return { status: "unknown", input };
  return { status: "found", place: fromSuggestion(first) };
}
