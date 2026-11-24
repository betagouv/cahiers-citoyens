import { describe, expect, it } from "vitest";
import { parsePositiveInteger, requireEnv } from "./args";

describe("parsePositiveInteger", () => {
  it("prend la valeur par défaut sans option", () => {
    expect(parsePositiveInteger("limit", undefined, 5)).toBe(5);
  });

  it("lit un entier positif", () => {
    expect(parsePositiveInteger("limit", "12", 5)).toBe(12);
  });

  it.each(["0", "-3", "1.5", "abc", ""])("refuse %j", (value) => {
    expect(() => parsePositiveInteger("batch", value, 5)).toThrow(
      `--batch attend un entier positif (reçu : ${value})`,
    );
  });
});

describe("requireEnv", () => {
  it("renvoie la variable définie", () => {
    expect(requireEnv({ DATABASE_URL: "postgres://x" }, "DATABASE_URL")).toBe(
      "postgres://x",
    );
  });

  it("refuse une variable absente ou vide", () => {
    expect(() => requireEnv({}, "DATABASE_URL")).toThrow(
      "DATABASE_URL est obligatoire",
    );
    expect(() => requireEnv({ ALBERT_API_KEY: "" }, "ALBERT_API_KEY")).toThrow(
      "ALBERT_API_KEY est obligatoire",
    );
  });
});
