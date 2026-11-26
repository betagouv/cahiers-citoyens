import { describe, expect, it } from "vitest";
import {
  type PlaceSuggestion,
  placeDescription,
  placeLabel,
  selectedPlace,
} from "./place-label";

const charolles: PlaceSuggestion = {
  kind: "municipality",
  code: "71106",
  name: "Charolles",
  departmentCode: "71",
  departmentName: "Saône-et-Loire",
  pageCount: 286,
};

const charente: PlaceSuggestion = {
  kind: "department",
  code: "16",
  name: "Charente",
  departmentCode: "16",
  departmentName: "Charente",
  pageCount: 1312,
};

describe("placeLabel", () => {
  it("suffixe le nom par le code du département", () => {
    expect(placeLabel(charolles)).toBe("Charolles (71)");
    expect(placeLabel(charente)).toBe("Charente (16)");
  });
});

describe("placeDescription", () => {
  it("décrit un département et une commune", () => {
    expect(placeDescription(charente)).toBe("Département");
    expect(placeDescription(charolles)).toBe("Commune · Saône-et-Loire (71)");
  });

  it("se contente de « Commune » hors des départements", () => {
    expect(
      placeDescription({
        ...charolles,
        departmentCode: "975",
        departmentName: null,
      }),
    ).toBe("Commune");
  });
});

describe("selectedPlace", () => {
  it("garde le code, l'étiquette et le nombre de pages", () => {
    expect(selectedPlace(charolles)).toEqual({
      code: "71106",
      label: "Charolles (71)",
      pageCount: 286,
    });
  });
});
