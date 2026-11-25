import { parsePageNumber } from "@/lib/notebooks";
import { parseKeyword } from "./keyword";

type SearchParams = Record<string, string | string[] | undefined>;

export interface PageSearch {
  // Texte ou codes du lieu, tels que reçus ; vide : toute la France.
  place: string;
  keyword: string;
  pageIndex: number;
}

// Le formulaire lieu et mot-clé envoie toujours `place`, même vide ; la barre
// de recherche, `q` seul, pour une question en langage courant.
export function parsePageSearch(params: SearchParams): PageSearch | undefined {
  const { place, q, page } = params;
  if (place === undefined) return undefined;
  return {
    place: (Array.isArray(place) ? place[0] : place).trim(),
    keyword: parseKeyword(q),
    pageIndex: parsePageNumber(page),
  };
}

// Lien vers une page de résultats ; `place` toujours présent, pour rester une
// recherche par lieu et mot-clé.
export function pageSearchHref(
  placeCode: string,
  keyword: string,
  pageIndex: number,
): string {
  const params = new URLSearchParams({ place: placeCode });
  if (keyword !== "") params.set("q", keyword);
  if (pageIndex > 1) params.set("page", String(pageIndex));
  return `/search?${params}`;
}
