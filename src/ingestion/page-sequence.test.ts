import { describe, expect, it } from "vitest";
import { checkPageSequence } from "./page-sequence";

function document(...pages: unknown[]) {
  return { pages };
}

function codes(value: unknown) {
  return checkPageSequence(value).map(({ code, page }) => ({ code, page }));
}

describe("checkPageSequence", () => {
  it("accepte des pages 1..n avec des images distinctes", () => {
    const value = document(
      { page: 1, image: "a.png" },
      { page: 2, image: "b.png" },
      { page: 3, image: "c.png" },
    );
    expect(checkPageSequence(value)).toEqual([]);
  });

  it("signale un trou", () => {
    const value = document(
      { page: 1, image: "a.png" },
      { page: 3, image: "c.png" },
    );
    expect(codes(value)).toEqual([{ code: "page-out-of-sequence", page: 2 }]);
  });

  it("signale un doublon", () => {
    const value = document(
      { page: 1, image: "a.png" },
      { page: 1, image: "b.png" },
    );
    expect(codes(value)).toEqual([{ code: "page-out-of-sequence", page: 2 }]);
  });

  it("signale des pages dans le désordre", () => {
    const value = document(
      { page: 2, image: "b.png" },
      { page: 1, image: "a.png" },
    );
    expect(codes(value)).toEqual([
      { code: "page-out-of-sequence", page: 1 },
      { code: "page-out-of-sequence", page: 2 },
    ]);
  });

  it("signale une image citée deux fois, à chaque nouvelle citation", () => {
    const value = document(
      { page: 1, image: "a.png" },
      { page: 2, image: "a.png" },
      { page: 3, image: "a.png" },
    );
    expect(checkPageSequence(value)).toEqual([
      {
        page: 2,
        code: "duplicate-image",
        message: "L'image a.png est déjà citée par la page en position 1.",
      },
      {
        page: 3,
        code: "duplicate-image",
        message: "L'image a.png est déjà citée par la page en position 1.",
      },
    ]);
  });

  it("explique le numéro attendu", () => {
    const [error] = checkPageSequence(document({ page: 4, image: "a.png" }));
    expect(error.message).toBe(
      "La page en position 1 porte le numéro 4, 1 attendu : les pages vont de 1 à n, dans l'ordre, sans trou ni doublon.",
    );
  });

  it("laisse au schéma les champs absents ou mal typés", () => {
    const value = document(
      { page: "1", image: 1 },
      null,
      { image: "c.png" },
      { page: 4 },
    );
    expect(checkPageSequence(value)).toEqual([]);
  });

  it.each([null, [], "texte", {}, { pages: "x" }])(
    "ignore un document sans liste de pages (%j)",
    (value) => {
      expect(checkPageSequence(value)).toEqual([]);
    },
  );
});
