import { expect, it } from "vitest";
import { ACCENTED, UNACCENTED, foldAccents } from "./fold-accents";

it.each([
  ["Retraités", "retraites"],
  ["ÉCOLE", "ecole"],
  ["Œuvre", "oeuvre"],
  ["Lætitia", "laetitia"],
  ["mois-ci", "mois-ci"],
  ["ça, là, où", "ca, la, ou"],
])("replie « %s » en « %s »", (value, expected) => {
  expect(foldAccents(value)).toBe(expected);
});

it("associe chaque lettre accentuée à une lettre sans accent", () => {
  expect([...ACCENTED]).toHaveLength(UNACCENTED.length);
  expect(UNACCENTED).toMatch(/^[a-z]+$/);
});
