import { describe, expect, it } from "vitest";
import { parseDepartments, parseMunicipalities } from "./geo-api";

describe("parseDepartments", () => {
  it("convertit les départements, Corse et outre-mer compris", () => {
    expect(
      parseDepartments([
        { nom: "Département fictif", code: "01", codeRegion: "84" },
        { nom: "Corse fictive", code: "2A", codeRegion: "94" },
        { nom: "Île fictive", code: "971", codeRegion: "01" },
      ]),
    ).toEqual([
      { code: "01", name: "Département fictif", regionCode: "84" },
      { code: "2A", name: "Corse fictive", regionCode: "94" },
      { code: "971", name: "Île fictive", regionCode: "01" },
    ]);
  });

  it.each([
    [{}, "geo.api /departements : tableau attendu"],
    [[null], "geo.api /departements, élément 0 : objet attendu"],
    [[[]], "geo.api /departements, élément 0 : objet attendu"],
    [
      [{ nom: "X", code: "1", codeRegion: "84" }],
      "geo.api /departements, élément 0 : code invalide",
    ],
    [
      [{ nom: " ", code: "01", codeRegion: "84" }],
      "geo.api /departements, élément 0 : nom manquant",
    ],
    [
      [{ nom: "X", code: "01", codeRegion: 84 }],
      "geo.api /departements, élément 0 : codeRegion invalide",
    ],
  ])("refuse %j", (raw, message) => {
    expect(() => parseDepartments(raw)).toThrow(message);
  });
});

const VALID = {
  nom: "Saint-Exemple-sur-Mer",
  code: "01001",
  codesPostaux: ["01400", "01401"],
  codeDepartement: "01",
  population: 860,
};

describe("parseMunicipalities", () => {
  it("convertit une commune et calcule son nom de recherche", () => {
    expect(parseMunicipalities([VALID])).toEqual([
      {
        inseeCode: "01001",
        name: "Saint-Exemple-sur-Mer",
        departmentCode: "01",
        population: 860,
        postalCodes: ["01400", "01401"],
        searchName: "saint exemple sur mer",
      },
    ]);
  });

  it("admet une commune sans population ni code postal", () => {
    const [municipality] = parseMunicipalities([
      {
        nom: "Archipel fictif",
        code: "98411",
        codeDepartement: "984",
        codesPostaux: [],
      },
    ]);

    expect(municipality).toMatchObject({ population: null, postalCodes: [] });
  });

  it.each([
    ["une liste", null, "tableau attendu"],
    ["un objet", ["x"], "élément 0 : objet attendu"],
    ["un code", { ...VALID, code: "1001" }, "code invalide"],
    ["un nom", { ...VALID, nom: 3 }, "nom manquant"],
    [
      "un département",
      { ...VALID, codeDepartement: "1" },
      "codeDepartement invalide",
    ],
    [
      "des codes postaux",
      { ...VALID, codesPostaux: ["014"] },
      "codesPostaux invalides",
    ],
    ["des codes postaux", { ...VALID, codesPostaux: "01400" }, "invalides"],
    ["une population", { ...VALID, population: -1 }, "population invalide"],
    ["une population", { ...VALID, population: "860" }, "invalide"],
  ])("refuse %s mal formé", (_label, element, message) => {
    const raw = element === null ? {} : [element];
    expect(() => parseMunicipalities(raw)).toThrow(message);
  });
});
