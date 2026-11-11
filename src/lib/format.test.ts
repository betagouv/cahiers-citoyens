import { describe, expect, it } from "vitest";
import {
  excerpt,
  formatDate,
  formatMonth,
  formatMonthRange,
  formatShare,
} from "./format";

describe("formatDate et formatMonth", () => {
  it("écrivent une date AAAA-MM-JJ en français, sans décalage de fuseau", () => {
    expect(formatDate("2019-02-08")).toBe("8 février 2019");
    expect(formatMonth("2019-01-01")).toBe("janvier 2019");
  });
});

describe("excerpt", () => {
  it("garde un texte court tel quel, espaces normalisés", () => {
    expect(excerpt("  Un   texte\ncourt. ", 50)).toBe("Un texte court.");
  });

  it("coupe à la fin d'un mot et ajoute une ellipse", () => {
    expect(excerpt("Les urgences sont saturées, on attend.", 27)).toBe(
      "Les urgences sont saturées…",
    );
  });
});

describe("formatMonthRange", () => {
  it("écrit la période du premier au dernier mois", () => {
    expect(formatMonthRange("2018-12-06", "2019-02-24")).toBe(
      "décembre 2018 – février 2019",
    );
  });

  it("n'écrit qu'un mois quand les deux dates y tombent", () => {
    expect(formatMonthRange("2019-01-03", "2019-01-28")).toBe("janvier 2019");
  });
});

describe("formatShare", () => {
  it("écrit une part en pourcentage, arrondie à l'inférieur", () => {
    expect(formatShare(258, 258)).toBe("100\u00a0%");
    expect(formatShare(257, 258)).toBe("99\u00a0%");
    expect(formatShare(1, 3)).toBe("33\u00a0%");
  });

  it("vaut 0 % sans rien à compter", () => {
    expect(formatShare(0, 0)).toBe("0\u00a0%");
  });
});
