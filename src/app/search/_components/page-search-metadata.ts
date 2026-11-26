import type { Metadata } from "next";
import {
  searchDescription,
  searchTitle,
} from "@/lib/page-search/results-summary";
import type { PageSearch } from "@/lib/page-search/search-params";
import { resolvePlaceForRequest } from "./resolve-place";

// Titre et description propres à chaque recherche. Les pages d'un lieu sont
// indexables (une par commune ou département) ; une recherche par mot-clé ne
// l'est pas, pour ne pas multiplier des pages de résultats presque vides.
export async function pageSearchMetadata(
  search: PageSearch,
): Promise<Metadata> {
  const resolution = await resolvePlaceForRequest(search.place);
  const label =
    resolution.status === "found" ? resolution.place.displayName : undefined;
  const indexable = resolution.status === "found" && search.keyword === "";
  return {
    title: searchTitle(search.keyword, label, search.pageIndex),
    description: searchDescription(search.keyword, label),
    robots: indexable ? undefined : { index: false, follow: true },
  };
}
