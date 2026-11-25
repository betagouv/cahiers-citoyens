import { type SQL, sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { likePrefix } from "./like-prefix";
import { type PlaceInput, parsePlaceInput } from "./place-input";
import type { PlaceSuggestion } from "./place-label";

export const MAX_PLACE_SUGGESTIONS = 8;

interface PlaceRow extends Record<string, unknown> {
  kind: string;
  code: string;
  name: string;
  department_code: string;
  department_name: string | null;
  page_count: number;
}

// Nom d'un département normalisé comme `toSearchName` : les 101 lignes sont
// lues à chaque requête, un index n'apporterait rien.
const departmentSearchName = sql`trim(regexp_replace(fold_accents(d.name), '[^a-z0-9]+', ' ', 'g'))`;

// Chaque branche a son index : nom (btree `text_pattern_ops`), code INSEE
// (clé primaire), code postal (GIN), département (btree).
function municipalityMatch(input: PlaceInput, pattern: string): SQL {
  const matches = [sql`m.search_name like ${pattern}`];
  if (input.typedDepartmentCode !== undefined) {
    matches.push(sql`m.department_code = ${input.typedDepartmentCode}`);
  }
  if (input.postalCodes.length > 0) {
    // Le tableau passe en un seul paramètre littéral : des chiffres seulement.
    const postalCodes = `{${input.postalCodes.join(",")}}`;
    matches.push(
      sql`m.insee_code = ${input.searchName}`,
      sql`m.postal_codes && ${postalCodes}::text[]`,
    );
  }
  return sql`(${sql.join(matches, sql` or `)})`;
}

// Départements et communes, y compris ceux sans page publiée (« À venir ») :
// d'abord le département dont le code ou le nom est exactement la saisie,
// puis par nombre de pages, puis par population.
export function placeSuggestionsQuery(input: PlaceInput): SQL {
  const pattern = likePrefix(input.searchName);
  const inDepartment =
    input.labelDepartmentCode === undefined
      ? sql`true`
      : sql`m.department_code = ${input.labelDepartmentCode}`;
  return sql`
    with found as (
      select 'department' as kind, d.code, d.name, d.code as department_code,
        d.name as department_name,
        (lower(d.code) = ${input.searchName} or ${departmentSearchName} = ${input.searchName}) as exact,
        (select sum(population) from municipalities where department_code = d.code) as population
      from departments d
      where ${input.labelDepartmentCode === undefined}
        and (lower(d.code) like ${pattern} or ${departmentSearchName} like ${pattern})
      union all
      select 'municipality', m.insee_code, m.name, m.department_code, d.name,
        false, m.population
      from municipalities m
      left join departments d on d.code = m.department_code
      where ${municipalityMatch(input, pattern)} and ${inDepartment}
    )
    select f.kind, f.code, f.name, f.department_code, f.department_name,
      coalesce(c.page_count, 0) as page_count
    from found f
    left join place_page_counts c on c.place = f.code
    order by f.exact desc, page_count desc, f.population desc nulls last, f.name
    limit ${MAX_PLACE_SUGGESTIONS}`;
}

function toSuggestion(row: PlaceRow): PlaceSuggestion {
  return {
    kind: row.kind === "department" ? "department" : "municipality",
    code: row.code,
    name: row.name,
    departmentCode: row.department_code,
    departmentName: row.department_name,
    pageCount: row.page_count,
  };
}

export async function suggestPlaces(value: string): Promise<PlaceSuggestion[]> {
  const input = parsePlaceInput(value);
  if (input === undefined) return [];
  const rows = await getDatabase().execute<PlaceRow>(
    placeSuggestionsQuery(input),
  );
  return rows.map(toSuggestion);
}
