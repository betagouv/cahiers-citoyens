import { describe, expect, it } from "vitest";
import {
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

    expect(
      parsePlaceSuggestions({
        suggestions: [charolles, outreMer, { ...charolles, kind: "region" }],
      }),
    ).toEqual([charolles, outreMer]);
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
