import { describe, expect, it } from "vitest";
import { parsePageNumber } from "./notebooks";

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
