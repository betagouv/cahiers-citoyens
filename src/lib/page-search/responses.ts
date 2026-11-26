import type { KeywordLine } from "../keyword-lines";
import type { PlaceSuggestion } from "./place-label";
import type { WordSuggestion } from "./word-suggestion";

// Réponses JSON des routes de suggestion, de compte et de lignes, relues côté navigateur :
// tout ce qui ne correspond pas au format attendu est écarté.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasPlaceKind(value: Record<string, unknown>): boolean {
  if (value.kind === "formerMunicipality") {
    return typeof value.currentName === "string";
  }
  return value.kind === "department" || value.kind === "municipality";
}

function isPlaceSuggestion(value: unknown): value is PlaceSuggestion {
  return (
    isRecord(value) &&
    hasPlaceKind(value) &&
    typeof value.code === "string" &&
    typeof value.name === "string" &&
    typeof value.departmentCode === "string" &&
    (typeof value.departmentName === "string" ||
      value.departmentName === null) &&
    typeof value.pageCount === "number"
  );
}

function isWordSuggestion(value: unknown): value is WordSuggestion {
  return (
    isRecord(value) &&
    typeof value.word === "string" &&
    typeof value.pageCount === "number"
  );
}

function isKeywordLine(value: unknown): value is KeywordLine {
  return (
    isRecord(value) &&
    typeof value.page === "number" &&
    typeof value.points === "string"
  );
}

function arrayAt(json: unknown, key: string): unknown[] {
  if (!isRecord(json)) return [];
  const value = json[key];
  return Array.isArray(value) ? value : [];
}

function suggestionsOf(json: unknown): unknown[] {
  return arrayAt(json, "suggestions");
}

export function parsePlaceSuggestions(json: unknown): PlaceSuggestion[] {
  return suggestionsOf(json).filter(isPlaceSuggestion);
}

export function parseWordSuggestions(json: unknown): WordSuggestion[] {
  return suggestionsOf(json).filter(isWordSuggestion);
}

export function parsePageCount(json: unknown): number | undefined {
  return isRecord(json) && typeof json.pageCount === "number"
    ? json.pageCount
    : undefined;
}

// Les contours de `/notebooks/<id>/lines`, regroupés par numéro de page.
export function parseKeywordLines(
  json: unknown,
): ReadonlyMap<number, readonly string[]> {
  const byPage = new Map<number, string[]>();
  for (const { page, points } of arrayAt(json, "lines").filter(isKeywordLine)) {
    byPage.set(page, [...(byPage.get(page) ?? []), points]);
  }
  return byPage;
}
