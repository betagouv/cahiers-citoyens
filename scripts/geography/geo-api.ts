import { toSearchName } from "../../src/geography/search-name";

export interface Department {
  code: string;
  name: string;
  regionCode: string;
}

export interface Municipality {
  inseeCode: string;
  name: string;
  departmentCode: string;
  population: number | null;
  postalCodes: string[];
  searchName: string;
}

// Corse (2A, 2B) comprise ; outre-mer sur trois chiffres.
const DEPARTMENT_CODE = /^(\d{2}|2[AB]|\d{3})$/;
const INSEE_CODE = /^(\d{5}|2[AB]\d{3})$/;
const POSTAL_CODE = /^\d{5}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function failure(source: string, index: number, reason: string): Error {
  return new Error(`${source}, élément ${index} : ${reason}`);
}

function requireArray(source: string, raw: unknown): unknown[] {
  if (!Array.isArray(raw)) throw new Error(`${source} : tableau attendu`);
  return raw;
}

function matching(
  record: Record<string, unknown>,
  field: string,
  pattern: RegExp,
): string | undefined {
  const value = record[field];
  return typeof value === "string" && pattern.test(value) ? value : undefined;
}

function nonEmpty(
  record: Record<string, unknown>,
  field: string,
): string | undefined {
  const value = record[field];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function parseDepartment(raw: unknown, index: number): Department {
  const source = "geo.api /departements";
  if (!isRecord(raw)) throw failure(source, index, "objet attendu");
  const code = matching(raw, "code", DEPARTMENT_CODE);
  const name = nonEmpty(raw, "nom");
  const regionCode = matching(raw, "codeRegion", /^\d{2}$/);
  if (code === undefined) throw failure(source, index, "code invalide");
  if (name === undefined) throw failure(source, index, "nom manquant");
  if (regionCode === undefined) {
    throw failure(source, index, "codeRegion invalide");
  }
  return { code, name, regionCode };
}

export function parseDepartments(raw: unknown): Department[] {
  return requireArray("geo.api /departements", raw).map(parseDepartment);
}

function parsePostalCodes(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const codes = value.filter(
    (code): code is string =>
      typeof code === "string" && POSTAL_CODE.test(code),
  );
  return codes.length === value.length ? codes : undefined;
}

function parsePopulation(value: unknown): number | null | undefined {
  if (value === undefined) return null;
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
}

function parseMunicipality(raw: unknown, index: number): Municipality {
  const source = "geo.api /communes";
  if (!isRecord(raw)) throw failure(source, index, "objet attendu");
  const inseeCode = matching(raw, "code", INSEE_CODE);
  const name = nonEmpty(raw, "nom");
  const departmentCode = matching(raw, "codeDepartement", DEPARTMENT_CODE);
  const postalCodes = parsePostalCodes(raw.codesPostaux);
  const population = parsePopulation(raw.population);
  if (inseeCode === undefined) throw failure(source, index, "code invalide");
  if (name === undefined) throw failure(source, index, "nom manquant");
  if (departmentCode === undefined) {
    throw failure(source, index, "codeDepartement invalide");
  }
  if (postalCodes === undefined) {
    throw failure(source, index, "codesPostaux invalides");
  }
  if (population === undefined) {
    throw failure(source, index, "population invalide");
  }
  return {
    inseeCode,
    name,
    departmentCode,
    population,
    postalCodes,
    searchName: toSearchName(name),
  };
}

export function parseMunicipalities(raw: unknown): Municipality[] {
  return requireArray("geo.api /communes", raw).map(parseMunicipality);
}
