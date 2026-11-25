import { describe, expect, it } from "vitest";
import {
  resultsSummary,
  searchDescription,
  searchTitle,
} from "./results-summary";

describe("resultsSummary", () => {
  it.each([
    [
      7,
      "retraite",
      "Charolles (71)",
      "7 pages à Charolles (71) contiennent « retraite »",
    ],
    [
      1,
      "retraité",
      "Charolles (71)",
      "1 page à Charolles (71) contient « retraité »",
    ],
    [1896, "retraite", undefined, "1 896 pages contiennent « retraite »"],
    [286, "", "Charolles (71)", "286 pages à Charolles (71)"],
    [
      0,
      "retraite",
      "Charolles (71)",
      "Aucune page publiée à Charolles (71) ne contient « retraite »",
    ],
    [
      0,
      "",
      "Charolles (71)",
      "Aucune page publiée à Charolles (71) pour l’instant",
    ],
  ])("%i, %j, %j : %s", (total, keyword, place, expected) => {
    expect(resultsSummary(total, keyword, place)).toBe(expected);
  });
});

describe("searchTitle", () => {
  it.each([
    ["retraite", "Charolles (71)", 1, "« retraite » à Charolles (71)"],
    ["retraite", undefined, 2, "« retraite » dans les cahiers, page 2"],
    ["", "Doubs (25)", 1, "Cahiers de Doubs (25)"],
    ["", undefined, 1, "Rechercher"],
  ])("%j, %j, %i : %s", (keyword, place, page, expected) => {
    expect(searchTitle(keyword, place, page)).toBe(expected);
  });
});

describe("searchDescription", () => {
  it("décrit les pages d'un lieu ou d'un mot-clé", () => {
    expect(searchDescription("", "Doubs (25)")).toBe(
      "Les pages des cahiers citoyens de Doubs (25), ouverts en mairie en 2019, transcrites et consultables.",
    );
    expect(searchDescription("retraite", undefined)).toBe(
      "Les pages des cahiers citoyens qui contiennent « retraite ».",
    );
  });
});
