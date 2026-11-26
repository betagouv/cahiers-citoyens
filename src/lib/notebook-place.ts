import type { NotebookPlace } from "./notebooks";

// « Charolles (71) », ou la commune seule si le département manque. `null`
// pour un cahier sans commune renseignée.
export function notebookPlaceLabel({
  municipalityName,
  departmentCode,
}: Pick<NotebookPlace, "municipalityName" | "departmentCode">): string | null {
  if (municipalityName === null) return null;
  return departmentCode === null
    ? municipalityName
    : `${municipalityName} (${departmentCode})`;
}

// « Charolles (71) : cahier citoyen », ou « Cahier <id> » sans commune. Le
// lieu vient en tête, sans préposition : « de » s'élide ou se contracte
// selon le nom (d'Ajaccio, du Havre).
export function notebookTitle(
  id: string,
  place: Pick<NotebookPlace, "municipalityName" | "departmentCode">,
): string {
  const label = notebookPlaceLabel(place);
  return label === null ? `Cahier ${id}` : `${label} : cahier citoyen`;
}
