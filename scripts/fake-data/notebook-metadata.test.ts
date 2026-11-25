import { describe, expect, it } from "vitest";
import {
  departmentCode,
  fakePostalCode,
  notebookMetadata,
} from "./notebook-metadata";
import { createRandom } from "./random";
import { shortNotebook } from "./test-notebook";

describe("departmentCode", () => {
  it("prend deux caractères, trois outre-mer", () => {
    expect(departmentCode("76351")).toBe("76");
    expect(departmentCode("2A004")).toBe("2A");
    expect(departmentCode("97411")).toBe("974");
  });
});

describe("fakePostalCode", () => {
  it("reste dans le département, 20 pour la Corse", () => {
    expect(fakePostalCode("76351", createRandom("cp"))).toMatch(/^76\d{2}0$/);
    expect(fakePostalCode("2B033", createRandom("cp"))).toMatch(/^20\d{2}0$/);
  });

  it("reste stable pour une même graine", () => {
    expect(fakePostalCode("01004", createRandom("x"))).toBe(
      fakePostalCode("01004", createRandom("x")),
    );
  });
});

describe("notebookMetadata", () => {
  it("remplit les métadonnées au format Condorcet", () => {
    expect(notebookMetadata(shortNotebook().municipality, "76600")).toEqual({
      departement: "Seine-Maritime",
      numero_departement: "76",
      commune: "Le Havre",
      code_insee: "76351",
      code_postal: "76600",
      type_transcription_dactylographiee: "automatique",
      type_transcription_manuscrite: "manuelle",
    });
  });
});
