import { describe, expect, it } from "vitest";
import { parsePlaceInput, postalCodesStartingWith } from "./place-input";

describe("postalCodesStartingWith", () => {
  it("complète 4 chiffres en 10 codes, garde un code complet", () => {
    expect(postalCodesStartingWith("71120")).toEqual(["71120"]);
    expect(postalCodesStartingWith("7112")).toEqual(
      Array.from({ length: 10 }, (_, index) => `7112${index}`),
    );
  });
});

describe("parsePlaceInput", () => {
  it("normalise un nom comme les noms de communes", () => {
    expect(parsePlaceInput("  Saint-Étienne")).toEqual({
      searchName: "saint etienne",
      labelDepartmentCode: undefined,
      typedDepartmentCode: undefined,
      postalCodes: [],
    });
  });

  it("lit le département d'une étiquette « Nom (code) »", () => {
    expect(parsePlaceInput("Charolles (71)")).toMatchObject({
      searchName: "charolles",
      labelDepartmentCode: "71",
    });
    expect(parsePlaceInput("Ajaccio (2a)")?.labelDepartmentCode).toBe("2A");
  });

  it("reconnaît un code de département", () => {
    expect(parsePlaceInput("71")).toEqual({
      searchName: "71",
      labelDepartmentCode: undefined,
      typedDepartmentCode: "71",
      postalCodes: [],
    });
    expect(parsePlaceInput("2a")?.typedDepartmentCode).toBe("2A");
    expect(parsePlaceInput("971")?.typedDepartmentCode).toBe("971");
  });

  it("cherche les codes postaux à partir de 4 chiffres", () => {
    expect(parsePlaceInput("71120")?.postalCodes).toEqual(["71120"]);
    expect(parsePlaceInput("7112")?.postalCodes).toHaveLength(10);
    expect(parsePlaceInput("712")?.postalCodes).toEqual([]);
    expect(parsePlaceInput("123456")?.postalCodes).toEqual([]);
  });

  it("attend au moins deux caractères", () => {
    expect(parsePlaceInput("C")).toBeUndefined();
    expect(parsePlaceInput(" - ")).toBeUndefined();
  });
});
