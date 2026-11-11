import { describe, expect, it } from "vitest";
import { notebookIdFromPath, parsePageNumber } from "./notebooks";

describe("parsePageNumber", () => {
  it("lit un entier positif", () => {
    expect(parsePageNumber("3")).toBe(3);
    expect(parsePageNumber(["2", "5"])).toBe(2);
  });

  it("ramène à la page 1 toute autre valeur", () => {
    expect(parsePageNumber(undefined)).toBe(1);
    expect(parsePageNumber("0")).toBe(1);
    expect(parsePageNumber("-2")).toBe(1);
    expect(parsePageNumber("1.5")).toBe(1);
    expect(parsePageNumber("abc")).toBe(1);
  });
});

describe("notebookIdFromPath", () => {
  it("lit l'identifiant d'une page de cahier", () => {
    expect(notebookIdFromPath("/notebooks/notebook-0001")).toBe(
      "notebook-0001",
    );
    expect(notebookIdFromPath("/notebooks/cahier%20%C3%A9t%C3%A9")).toBe(
      "cahier été",
    );
  });

  it("ignore les autres chemins", () => {
    expect(notebookIdFromPath("/notebooks")).toBeUndefined();
    expect(notebookIdFromPath("/notebooks/")).toBeUndefined();
    expect(notebookIdFromPath("/notebooks/notebook-0001/scan")).toBeUndefined();
    expect(notebookIdFromPath("/search")).toBeUndefined();
  });

  it("ignore un encodage invalide", () => {
    expect(notebookIdFromPath("/notebooks/%E0%A4%A")).toBeUndefined();
  });
});
