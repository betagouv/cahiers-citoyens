import { describe, expect, it } from "vitest";
import { pageSearchHref, parsePageSearch } from "./search-params";

describe("parsePageSearch", () => {
  it("reconnaît la recherche par lieu et mot-clé à `place`, même vide", () => {
    expect(parsePageSearch({ place: "", q: " retraite " })).toEqual({
      place: "",
      keyword: "retraite",
      pageIndex: 1,
    });
    expect(parsePageSearch({ place: [" 71106 ", "25"], page: "3" })).toEqual({
      place: "71106",
      keyword: "",
      pageIndex: 3,
    });
  });

  it("laisse une question seule à la recherche en langage courant", () => {
    expect(parsePageSearch({ q: "médecin" })).toBeUndefined();
  });
});

describe("pageSearchHref", () => {
  it("construit le lien d'une page de résultats", () => {
    expect(pageSearchHref("71106", "retraite", 1)).toBe(
      "/search?place=71106&q=retraite",
    );
    expect(pageSearchHref("971,972", "", 2)).toBe(
      "/search?place=971%2C972&page=2",
    );
    expect(pageSearchHref("", "impôts", 1)).toBe(
      "/search?place=&q=imp%C3%B4ts",
    );
  });
});
