import { expect, it } from "vitest";
import { toSearchName } from "./search-name";

it.each([
  ["L'Haÿ-les-Roses", "l hay les roses"],
  ["Saint-Étienne", "saint etienne"],
  ["Œuilly", "oeuilly"],
  ["Lætitia-sur-Mer", "laetitia sur mer"],
  ["  Marseille 2e  Arrondissement ", "marseille 2e arrondissement"],
])("ramène « %s » à « %s »", (name, expected) => {
  expect(toSearchName(name)).toBe(expected);
});
