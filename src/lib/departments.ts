import {
  ABSENT_DEPARTMENT_CODES,
  PUBLISHED_AREAS,
  type PublishedArea,
} from "./department-registry";

export const PUBLICATION_STATUSES = ["online", "upcoming", "absent"] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const PUBLICATION_STATUS_LABELS: Record<PublicationStatus, string> = {
  online: "Cahiers en ligne",
  upcoming: "Cahiers à venir",
  absent: "Pas de cahier dans le fonds numérisé",
};

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
