import { describe, expect, it } from "vitest";
import {
  formatPlaceCodes,
  parseOptionalPlace,
  parsePlaceCodes,
} from "./place-codes";

describe("parsePlaceCodes", () => {
  it.each([
    ["71106", { kind: "municipality", code: "71106" }],
    ["2a004", { kind: "municipality", code: "2A004" }],
    ["25", { kind: "departments", codes: ["25"] }],
    ["2b", { kind: "departments", codes: ["2B"] }],
    ["971, 972,972", { kind: "departments", codes: ["971", "972"] }],
    ["975", { kind: "departments", codes: ["975"] }],
  ])("lit %j", (value, expected) => {
    expect(parsePlaceCodes(value)).toEqual(expected);
  });

  it.each([
    "",
    "Charolles",
    "7",
    "1234",
    "71106,71107",
    "25,71106",
    Array.from({ length: 21 }, (_, index) => String(10 + index)).join(","),
  ])("refuse %j", (value) => {
    expect(parsePlaceCodes(value)).toBeUndefined();
  });
});

describe("formatPlaceCodes", () => {
  it("redonne la valeur du paramètre", () => {
    expect(formatPlaceCodes({ kind: "municipality", code: "71106" })).toBe(
      "71106",
    );
    expect(
      formatPlaceCodes({ kind: "departments", codes: ["971", "972"] }),
    ).toBe("971,972");
  });
});

describe("parseOptionalPlace", () => {
  it("distingue un lieu absent, valide ou invalide", () => {
    expect(parseOptionalPlace("")).toBeUndefined();
    expect(parseOptionalPlace("25")).toEqual({
      kind: "departments",
      codes: ["25"],
    });
    expect(parseOptionalPlace("Charolles")).toBe("invalid");
  });
});
