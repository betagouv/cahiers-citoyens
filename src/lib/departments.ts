export const PUBLICATION_STATUSES = ["online", "upcoming", "absent"] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const PUBLICATION_STATUS_LABELS: Record<PublicationStatus, string> = {
  online: "Cahiers en ligne",
  upcoming: "Cahiers à venir",
  absent: "Pas de cahier dans le fonds numérisé",
};

// Une étiquette de la page d'accueil : « Outre-mer » regroupe plusieurs codes.
export interface PublishedArea {
  label: string;
  codes: readonly string[];
}

export const PUBLISHED_AREAS: readonly PublishedArea[] = [
  { label: "Alpes-de-Haute-Provence", codes: ["04"] },
  { label: "Creuse", codes: ["23"] },
  { label: "Doubs", codes: ["25"] },
  { label: "Gironde", codes: ["33"] },
  { label: "Manche", codes: ["50"] },
  { label: "Outre-mer", codes: ["971", "972", "973", "974", "976"] },
  { label: "Seine-Saint-Denis", codes: ["93"] },
  { label: "Somme", codes: ["80"] },
];

export const ABSENT_DEPARTMENT_CODES: readonly string[] = [];

export function publishedAreaOf(code: string): PublishedArea | undefined {
  return PUBLISHED_AREAS.find((area) => area.codes.includes(code));
}

export function publicationStatus(code: string): PublicationStatus {
  if (publishedAreaOf(code) !== undefined) return "online";
  if (ABSENT_DEPARTMENT_CODES.includes(code)) return "absent";
  return "upcoming";
}

export function areaHref(area: PublishedArea): string {
  return `/search?place=${area.codes.join(",")}`;
}

// Les départements d'outre-mer ont un code à trois chiffres (971 à 976).
export function isOverseasDepartment(code: string): boolean {
  return code.length === 3;
}

export function onlineMetropolitanDepartmentCount(): number {
  return PUBLISHED_AREAS.flatMap((area) => area.codes).filter(
    (code) => !isOverseasDepartment(code),
  ).length;
}
