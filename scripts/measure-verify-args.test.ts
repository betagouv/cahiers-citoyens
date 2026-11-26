import { describe, expect, it } from "vitest";
import { parseMeasureVerifyArgs } from "./measure-verify-args";

describe("parseMeasureVerifyArgs", () => {
  it("vérifie un ZIP existant", () => {
    expect(parseMeasureVerifyArgs(["--zip", "a.zip"])).toEqual({
      mode: "zip",
      zip: "a.zip",
    });
  });

  it("génère un dépôt de --count cahiers", () => {
    expect(parseMeasureVerifyArgs([])).toEqual({
      mode: "generate",
      count: 50,
      out: "data/deliveries",
    });
    expect(parseMeasureVerifyArgs(["--count", "3", "--out", "x"])).toEqual({
      mode: "generate",
      count: 3,
      out: "x",
    });
  });

  it.each(["0", "1.5", "10000", "abc"])("refuse --count %s", (count) => {
    expect(() => parseMeasureVerifyArgs(["--count", count])).toThrow(
      `--count doit être un entier entre 1 et 9999 (reçu : ${count})`,
    );
  });
});
