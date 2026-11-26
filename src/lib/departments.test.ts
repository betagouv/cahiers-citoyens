import { describe, expect, it } from "vitest";
import {
  departmentTooltip,
  isOverseasDepartment,
  notebookCountLabel,
} from "./departments";

describe("isOverseasDepartment", () => {
  it("reconnaît les codes à trois chiffres de l'outre-mer", () => {
    expect(isOverseasDepartment("974")).toBe(true);
    expect(isOverseasDepartment("2A")).toBe(false);
    expect(isOverseasDepartment("04")).toBe(false);
  });
});

describe("notebookCountLabel", () => {
  it("accorde le nombre de cahiers", () => {
    expect(notebookCountLabel(1)).toBe("1 cahier en ligne");
    expect(notebookCountLabel(12)).toBe("12 cahiers en ligne");
  });
});

describe("departmentTooltip", () => {
  it("donne le nombre de cahiers d'un département en ligne", () => {
    expect(
      departmentTooltip("Doubs", "25", {
        code: "25",
        name: "Doubs",
        notebookCount: 3,
      }),
    ).toBe("Doubs (25) · 3 cahiers en ligne");
  });

  it("annonce à venir un département sans cahier publié", () => {
    expect(departmentTooltip("Paris", "75", undefined)).toBe(
      "Paris (75) · Cahiers à venir",
    );
  });
});
