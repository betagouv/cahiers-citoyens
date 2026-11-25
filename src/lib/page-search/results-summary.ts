import { formatNumber } from "@/lib/format";

// Titre de la liste de résultats : « 7 pages contiennent « retraite » à
// Charolles (71) », « 286 pages à Charolles (71) ».
export function resultsSummary(
  total: number,
  keyword: string,
  placeLabel: string | undefined,
): string {
  const where = placeLabel === undefined ? "" : ` à ${placeLabel}`;
  if (total === 0) {
    return keyword === ""
      ? `Aucune page publiée${where} pour l’instant`
      : `Aucune page publiée${where} ne contient « ${keyword} »`;
  }
  const pages = total === 1 ? "1 page" : `${formatNumber(total)} pages`;
  if (keyword === "") return `${pages}${where}`;
  const verb = total === 1 ? "contient" : "contiennent";
  return `${pages}${where} ${verb} « ${keyword} »`;
}

// Le titre de l'onglet, qui doit dire ce que la page montre.
export function searchTitle(
  keyword: string,
  placeLabel: string | undefined,
  pageIndex: number,
): string {
  let title = "Rechercher";
  if (keyword !== "" && placeLabel !== undefined) {
    title = `« ${keyword} » à ${placeLabel}`;
  } else if (keyword !== "") {
    title = `« ${keyword} » dans les cahiers`;
  } else if (placeLabel !== undefined) {
    title = `Cahiers de ${placeLabel}`;
  }
  return pageIndex > 1 ? `${title}, page ${pageIndex}` : title;
}

export function searchDescription(
  keyword: string,
  placeLabel: string | undefined,
): string {
  const where = placeLabel === undefined ? "" : ` de ${placeLabel}`;
  return keyword === ""
    ? `Les pages des cahiers citoyens${where}, ouverts en mairie en 2019, transcrites et consultables.`
    : `Les pages des cahiers citoyens${where} qui contiennent « ${keyword} ».`;
}
