import { describe, expect, it } from "vitest";
import type { Municipality } from "./domain";
import { createRandom } from "./random";
import { fillTemplate } from "./template";

const LE_HAVRE: Municipality = {
  name: "Le Havre",
  inseeCode: "76351",
  department: "Seine-Maritime",
  region: "Normandie",
};

describe("fillTemplate", () => {
  it("accorde la préposition, en gardant la majuscule de début de phrase", () => {
    const random = createRandom("t");
    expect(fillTemplate("Je vis à {municipality}.", LE_HAVRE, random)).toBe(
      "Je vis au Havre.",
    );
    expect(fillTemplate("De {municipality}, rien.", LE_HAVRE, random)).toBe(
      "Du Havre, rien.",
    );
    expect(fillTemplate("À {municipality} aussi.", LE_HAVRE, random)).toBe(
      "Au Havre aussi.",
    );
    expect(fillTemplate("{municipality} attend.", LE_HAVRE, random)).toBe(
      "Le Havre attend.",
    );
  });

  it("remplit les nombres dans leurs bornes", () => {
    const text = fillTemplate(
      "{km} km, {euros} euros, {years} ans, {months} mois",
      LE_HAVRE,
      createRandom("n"),
    );
    const [km, euros, years, months] = (text.match(/\d+/g) ?? []).map(Number);
    expect(km).toBeGreaterThanOrEqual(8);
    expect(km).toBeLessThanOrEqual(70);
    expect(euros % 10).toBe(0);
    expect(years).toBeGreaterThanOrEqual(3);
    expect(months).toBeLessThanOrEqual(14);
  });

  it("refuse un gabarit inconnu", () => {
    expect(() =>
      fillTemplate("{inconnu}", LE_HAVRE, createRandom("x")),
    ).toThrow("gabarit inconnu : {inconnu}");
  });
});
