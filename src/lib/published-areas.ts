import { type OnlineDepartment, isOverseasDepartment } from "./departments";

// Une étiquette de la page d'accueil : un département de métropole, ou
// « Outre-mer », qui regroupe les départements d'outre-mer en ligne.
export interface PublishedArea {
  label: string;
  codes: readonly string[];
}

const OVERSEAS_LABEL = "Outre-mer";

// Les zones en ligne, dans l'ordre alphabétique de leur nom.
export function publishedAreas(
  departments: readonly OnlineDepartment[],
): PublishedArea[] {
  const overseas = departments.filter((department) =>
    isOverseasDepartment(department.code),
  );
  const areas: PublishedArea[] = departments
    .filter((department) => !isOverseasDepartment(department.code))
    .map((department) => ({
      label: department.name,
      codes: [department.code],
    }));
  if (overseas.length > 0)
    areas.push({
      label: OVERSEAS_LABEL,
      codes: overseas.map((department) => department.code).toSorted(),
    });
  return areas.toSorted((a, b) => a.label.localeCompare(b.label, "fr"));
}

export function areaHref(area: PublishedArea): string {
  return `/search?place=${area.codes.join(",")}`;
}

// Où mène le clic sur un département de la carte : la recherche de sa zone.
export function areaHrefByCode(
  areas: readonly PublishedArea[],
): ReadonlyMap<string, string> {
  return new Map(
    areas.flatMap((area) => area.codes.map((code) => [code, areaHref(area)])),
  );
}
