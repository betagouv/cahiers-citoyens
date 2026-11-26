import { describe, expect, it } from "vitest";
import {
  parseKeywordLines,
  parsePageCount,
  parsePlaceSuggestions,
  parseWordSuggestions,
} from "./responses";

const charolles = {
  kind: "municipality",
  code: "71106",
  name: "Charolles",
  departmentCode: "71",
  departmentName: "Saône-et-Loire",
  pageCount: 286,
};

describe("parsePlaceSuggestions", () => {
  it("garde les propositions bien formées", () => {
    const outreMer = { ...charolles, departmentName: null, kind: "department" };
    const former = {
      ...charolles,
      kind: "formerMunicipality",
      currentName: "Commune Actuelle",
    };

    expect(
      parsePlaceSuggestions({
        suggestions: [
          charolles,
          outreMer,
          former,
          { ...charolles, kind: "region" },
          { ...charolles, kind: "formerMunicipality" },
        ],
      }),
    ).toEqual([charolles, outreMer, former]);
  });

  it.each([
    null,
    "texte",
    { suggestions: "non" },
    { suggestions: [null, { ...charolles, pageCount: "286" }] },
    { suggestions: [{ ...charolles, departmentName: 3 }] },
  ])("écarte %j", (json) => {
    expect(parsePlaceSuggestions(json)).toEqual([]);
  });
});

describe("parseWordSuggestions", () => {
  it("garde les mots et leur nombre de pages", () => {
    expect(
      parseWordSuggestions({
        suggestions: [
          { word: "retraite", pageCount: 7 },
          { word: "retraites" },
          { pageCount: 1 },
        ],
      }),
    ).toEqual([{ word: "retraite", pageCount: 7 }]);
  });
});

describe("parsePageCount", () => {
  it("lit le nombre de pages", () => {
    expect(parsePageCount({ pageCount: 7 })).toBe(7);
    expect(parsePageCount({ pageCount: "7" })).toBeUndefined();
    expect(parsePageCount(undefined)).toBeUndefined();
  });
});

describe("parseKeywordLines", () => {
  it("regroupe les contours par page, dans l'ordre reçu", () => {
    expect(
      parseKeywordLines({
        lines: [
          { page: 1, points: "0,0 1,1" },
          { page: 3, points: "2,2 3,3" },
          { page: 1, points: "4,4 5,5" },
          { page: "1", points: "6,6" },
        ],
      }),
    ).toEqual(
      new Map([
        [1, ["0,0 1,1", "4,4 5,5"]],
        [3, ["2,2 3,3"]],
      ]),
    );
  });

  it.each([undefined, "texte", { lines: "non" }])(
    "ne trace rien pour %j",
    (json) => {
      expect(parseKeywordLines(json)).toEqual(new Map());
    },
  );
});
