import type { PlaceSuggestion } from "./place-label";
import type { WordSuggestion } from "./word-suggestion";

// Réponses JSON des routes de suggestion et de compte, relues côté navigateur :
// tout ce qui ne correspond pas au format attendu est écarté.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlaceSuggestion(value: unknown): value is PlaceSuggestion {
  return (
    isRecord(value) &&
    (value.kind === "department" || value.kind === "municipality") &&
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

function suggestionsOf(json: unknown): unknown[] {
  return isRecord(json) && Array.isArray(json.suggestions)
    ? json.suggestions
    : [];
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
