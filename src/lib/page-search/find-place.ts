import { eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { departments, municipalities, placePageCounts } from "@/db/schema";
import { type PlaceCodes, parsePlaceCodes } from "./place-codes";
import { placeLabel } from "./place-label";
import { suggestPlaces } from "./suggest-places";

// Un lieu reconnu : ses codes pour filtrer, son nom pour l'afficher, et son
// nombre de pages publiées.
export interface ResolvedPlace {
  codes: PlaceCodes;
  label: string;
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
  return {
    codes: { kind: "departments", codes: found.map((row) => row.code) },
    label:
      found.length === 1
        ? placeLabel({ name: found[0].name, departmentCode: found[0].code })
        : found.map((row) => row.name).join(", "),
    pageCount: found.reduce((sum, row) => sum + row.pageCount, 0),
  };
}

// Un ancien code INSEE (celui d'un cahier) mène à la commune actuelle.
async function findMunicipality(
  code: string,
): Promise<ResolvedPlace | undefined> {
  const [row] = await getDatabase()
    .select({
      code: municipalities.inseeCode,
      name: municipalities.name,
      departmentCode: municipalities.departmentCode,
      pageCount,
    })
    .from(municipalities)
    .leftJoin(
      placePageCounts,
      eq(placePageCounts.place, municipalities.inseeCode),
    )
    .where(
      eq(
        municipalities.inseeCode,
        sql`coalesce((select current_code from municipality_code_history where old_code = ${code}), ${code})`,
      ),
    );
  if (row === undefined) return undefined;
  return {
    codes: { kind: "municipality", code: row.code },
    label: placeLabel(row),
    pageCount: row.pageCount,
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
  return {
    status: "found",
    place: {
      codes:
        first.kind === "department"
          ? { kind: "departments", codes: [first.code] }
          : { kind: "municipality", code: first.code },
      label: placeLabel(first),
      pageCount: first.pageCount,
    },
  };
}
