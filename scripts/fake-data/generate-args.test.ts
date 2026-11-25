import { describe, expect, it } from "vitest";
import { parseGenerateArgs } from "./generate-args";

describe("parseGenerateArgs", () => {
  it("a des valeurs par défaut", () => {
    expect(parseGenerateArgs([])).toEqual({
      count: 200,
      out: "data/fake-data",
      seed: "42",
    });
  });

  it("lit chaque option", () => {
    expect(
      parseGenerateArgs(["--count", "3", "--out", "tmp", "--seed", "7"]),
    ).toEqual({ count: 3, out: "tmp", seed: "7" });
  });

  it("refuse un nombre de cahiers hors bornes", () => {
    for (const count of ["0", "1.5", "10000", "abc"]) {
      expect(() => parseGenerateArgs(["--count", count])).toThrow(
        "--count doit être un entier entre 1 et 9999",
      );
    }
  });
});
