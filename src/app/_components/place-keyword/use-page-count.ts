"use client";

import { parseKeyword } from "@/lib/page-search/keyword";
import type { SelectedPlace } from "@/lib/page-search/place-label";
import { parsePageCount } from "@/lib/page-search/responses";
import type { PageCountState } from "@/lib/page-search/submit-label";
import { useDebouncedJson } from "./use-debounced-json";

// Le nombre de pages que montrera le formulaire. Un lieu seul : son nombre,
// connu depuis la suggestion choisie. Un mot entier (`keyword`, vide pour un
// début de mot) : compté par `/api/pages/count`, dans le lieu choisi ou dans
// toute la France. Un lieu saisi mais pas choisi : inconnu, la page de
// résultats l'interprétera.
export function usePageCount(
  place: SelectedPlace | null,
  placeText: string,
  keyword: string,
): PageCountState {
  const typedKeyword = parseKeyword(keyword);
  const placeIsSettled = place !== null || placeText.trim() === "";
  let url: string | null = null;
  if (typedKeyword !== "" && placeIsSettled) {
    const params = new URLSearchParams({ q: typedKeyword });
    if (place !== null) params.set("place", place.code);
    url = `/api/pages/count?${params}`;
  }
  const { data, loading } = useDebouncedJson(url, parsePageCount);
  if (url === null) {
    return place === null || typedKeyword !== ""
      ? { status: "unknown" }
      : { status: "known", pageCount: place.pageCount };
  }
  if (loading) return { status: "loading" };
  return data === undefined
    ? { status: "unknown" }
    : { status: "known", pageCount: data };
}
