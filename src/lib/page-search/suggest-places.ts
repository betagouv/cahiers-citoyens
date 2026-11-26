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
  // Vide hors des anciennes communes.
  current_name: string;
}

// Nom d'un département normalisé comme `toSearchName` : les 101 lignes sont
// lues à chaque requête, un index n'apporterait rien.
const departmentSearchName = sql`trim(regexp_replace(fold_accents(d.name), '[^a-z0-9]+', ' ', 'g'))`;

// Colonnes d'une commune, actuelle (`m`) ou de 2019 (`h`), pour la comparer à
// la saisie.
interface MunicipalityColumns {
  searchName: SQL;
  code: SQL;
  departmentCode: SQL;
  // Les anciennes communes n'ont pas de code postal.
  postalCodes?: SQL;
}

// Chaque branche a son index : nom (btree `text_pattern_ops`), code INSEE
// (clé primaire), code postal (GIN), département (btree).
function municipalityMatch(
  columns: MunicipalityColumns,
  input: PlaceInput,
  pattern: string,
): SQL {
  const matches = [sql`${columns.searchName} like ${pattern}`];
  if (input.typedDepartmentCode !== undefined) {
    matches.push(sql`${columns.departmentCode} = ${input.typedDepartmentCode}`);
  }
  if (input.postalCodes.length > 0) {
    matches.push(sql`${columns.code} = ${input.searchName}`);
    if (columns.postalCodes !== undefined) {
      // Le tableau passe en un seul paramètre littéral : des chiffres seulement.
      const postalCodes = `{${input.postalCodes.join(",")}}`;
      matches.push(sql`${columns.postalCodes} && ${postalCodes}::text[]`);
    }
  }
  const inDepartment =
    input.labelDepartmentCode === undefined
      ? sql`true`
      : sql`${columns.departmentCode} = ${input.labelDepartmentCode}`;
  return sql`(${sql.join(matches, sql` or `)}) and ${inDepartment}`;
}

const CURRENT: MunicipalityColumns = {
  searchName: sql`m.search_name`,
  code: sql`m.insee_code`,
  departmentCode: sql`m.department_code`,
  postalCodes: sql`m.postal_codes`,
};

const FORMER: MunicipalityColumns = {
  searchName: sql`h.search_name`,
  code: sql`h.old_code`,
  departmentCode: sql`h.department_code`,
};

// Communes de 2019 fusionnées depuis, sous leur nom de 2019. Une ancienne
// commune qui porte le nom de sa commune actuelle (simple changement de code)
// serait un doublon : elle n'est pas proposée. Un nom vide attend le
// rechargement du référentiel (migration 0009).
function formerMunicipalities(input: PlaceInput, pattern: string): SQL {
  return sql`
      select 'formerMunicipality', h.old_code, h.name, h.department_code,
        d.name, false, null::integer, cur.name
      from municipality_code_history h
      join municipalities cur on cur.insee_code = h.current_code
      left join departments d on d.code = h.department_code
      where ${municipalityMatch(FORMER, input, pattern)}
        and h.name <> '' and h.search_name <> cur.search_name`;
}

// Départements, communes actuelles et anciennes, y compris ceux sans page
// publiée (« À venir ») : d'abord le département dont le code ou le nom est
// exactement la saisie, puis par nombre de pages, puis par population (une
// ancienne commune n'en a plus : elle passe après les communes actuelles sans
// page).
export function placeSuggestionsQuery(input: PlaceInput): SQL {
  const pattern = likePrefix(input.searchName);
  return sql`
    with found as (
      select 'department' as kind, d.code, d.name, d.code as department_code,
        d.name as department_name,
        (lower(d.code) = ${input.searchName} or ${departmentSearchName} = ${input.searchName}) as exact,
        (select sum(population) from municipalities where department_code = d.code) as population,
        null as current_name
      from departments d
      where ${input.labelDepartmentCode === undefined}
        and (lower(d.code) like ${pattern} or ${departmentSearchName} like ${pattern})
      union all
      select 'municipality', m.insee_code, m.name, m.department_code, d.name,
        false, m.population, null
      from municipalities m
      left join departments d on d.code = m.department_code
      where ${municipalityMatch(CURRENT, input, pattern)}
      union all${formerMunicipalities(input, pattern)}
    )
    select f.kind, f.code, f.name, f.department_code, f.department_name,
      coalesce(c.page_count, 0) as page_count,
      coalesce(f.current_name, '') as current_name
    from found f
    left join place_page_counts c on c.place = f.code
    order by f.exact desc, page_count desc, f.population desc nulls last, f.name
    limit ${MAX_PLACE_SUGGESTIONS}`;
}

function toSuggestion(row: PlaceRow): PlaceSuggestion {
  const base = {
    code: row.code,
    name: row.name,
    departmentCode: row.department_code,
    departmentName: row.department_name,
    pageCount: row.page_count,
  };
  if (row.kind === "formerMunicipality") {
    return {
      ...base,
      kind: "formerMunicipality",
      currentName: row.current_name,
    };
  }
  return {
    ...base,
    kind: row.kind === "department" ? "department" : "municipality",
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
