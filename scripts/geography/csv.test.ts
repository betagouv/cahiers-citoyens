import { expect, it } from "vitest";
import { parseCsv } from "./csv";

it("lit les champs cités ou non, avec guillemets doublés et virgules", () => {
  expect(parseCsv('"A","B",C\r\n"x, y","dit ""oui""",3\r\n')).toEqual([
    ["A", "B", "C"],
    ["x, y", 'dit "oui"', "3"],
  ]);
});

it("garde un retour à la ligne cité et ignore les lignes vides", () => {
  expect(parseCsv('a,"b\nc"\n\nd,')).toEqual([
    ["a", "b\nc"],
    ["d", ""],
  ]);
});
