// Un département qui a au moins un cahier publié, tel que la page d'accueil le
// reçoit du serveur (`listOnlineDepartments`) : de simples valeurs, pour
// descendre jusqu'à la carte, composant client.
export interface OnlineDepartment {
  code: string;
  name: string;
  notebookCount: number;
}

export const PUBLICATION_STATUSES = ["online", "upcoming"] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const PUBLICATION_STATUS_LABELS: Record<PublicationStatus, string> = {
  online: "Cahiers en ligne",
  upcoming: "Cahiers à venir",
};

// Les départements d'outre-mer ont un code à trois chiffres (971 à 976).
export function isOverseasDepartment(code: string): boolean {
  return code.length === 3;
}

export function notebookCountLabel(count: number): string {
  return count === 1 ? "1 cahier en ligne" : `${count} cahiers en ligne`;
}

// L'infobulle de la carte : « Doubs (25) · 3 cahiers en ligne ».
export function departmentTooltip(
  name: string,
  code: string,
  online: OnlineDepartment | undefined,
): string {
  const availability =
    online === undefined
      ? PUBLICATION_STATUS_LABELS.upcoming
      : notebookCountLabel(online.notebookCount);
  return `${name} (${code}) · ${availability}`;
}
