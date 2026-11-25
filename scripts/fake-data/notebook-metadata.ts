import type { RawMetadata } from "../../src/ingestion/condorcet-notebook";
import type { Municipality } from "./domain";
import type { Random } from "./random";

export function departmentCode(inseeCode: string): string {
  return inseeCode.startsWith("97")
    ? inseeCode.slice(0, 3)
    : inseeCode.slice(0, 2);
}

// Code postal fictif, mais dans le bon département (20 pour la Corse).
export function fakePostalCode(inseeCode: string, random: Random): string {
  const prefix = /^2[AB]/.test(inseeCode) ? "20" : inseeCode.slice(0, 2);
  return `${prefix}${String(random.int(0, 99) * 10).padStart(3, "0")}`;
}

// Les modes de transcription reprennent ceux du dépôt observé.
export function notebookMetadata(
  municipality: Municipality,
  postalCode: string,
): RawMetadata {
  return {
    departement: municipality.department,
    numero_departement: departmentCode(municipality.inseeCode),
    commune: municipality.name,
    code_insee: municipality.inseeCode,
    code_postal: postalCode,
    type_transcription_dactylographiee: "automatique",
    type_transcription_manuscrite: "manuelle",
  };
}
