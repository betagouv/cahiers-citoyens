import { describe, expect, it } from "vitest";
import { notebookPlaceLabel, notebookTitle } from "./notebook-place";

const CHAROLLES = { municipalityName: "Charolles", departmentCode: "71" };
const UNKNOWN = { municipalityName: null, departmentCode: null };

describe("notebookPlaceLabel", () => {
  it("nomme la commune et son département", () => {
    expect(notebookPlaceLabel(CHAROLLES)).toBe("Charolles (71)");
    expect(
      notebookPlaceLabel({
        municipalityName: "Charolles",
        departmentCode: null,
      }),
    ).toBe("Charolles");
  });

  it("renvoie null sans commune", () => {
    expect(notebookPlaceLabel(UNKNOWN)).toBeNull();
  });
});

describe("notebookTitle", () => {
  it("titre le cahier par sa commune, sinon par son identifiant", () => {
    expect(notebookTitle("CC_1", CHAROLLES)).toBe(
      "Charolles (71) : cahier citoyen",
    );
    expect(notebookTitle("CC_1", UNKNOWN)).toBe("Cahier CC_1");
  });
});
