import { expect, it } from "vitest";
import { MAX_KEYWORD_LENGTH, parseKeyword } from "./keyword";

it("normalise les espaces", () => {
  expect(parseKeyword("  prix   du\tcarburant ")).toBe("prix du carburant");
  expect(parseKeyword(["retraite", "impôts"])).toBe("retraite");
});

it("borne la longueur", () => {
  expect(parseKeyword("a".repeat(150))).toHaveLength(MAX_KEYWORD_LENGTH);
});

it("vaut chaîne vide sans lettre ni chiffre", () => {
  expect(parseKeyword(undefined)).toBe("");
  expect(parseKeyword(" ?! - ")).toBe("");
  expect(parseKeyword("2019")).toBe("2019");
  expect(parseKeyword("État")).toBe("État");
});
