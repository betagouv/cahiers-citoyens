"use client";

import { useSearchParams } from "next/navigation";
import { parseKeyword } from "@/lib/page-search/keyword";
import { PagesView, type PagesViewProps } from "./pages-view";

// Le mot-clé `?q=` se lit ici, au rendu de la requête puis dans le
// navigateur, et non dans la page serveur : la lecture du cahier ne dépend
// pas de l'URL. Pas de frontière Suspense propre : la page lit déjà la base
// hors du prérendu, et un repli sans surlignage, remplacé ensuite, décalerait
// la page ouverte sur une ancre `#page-<n>` de la hauteur du résumé.
export function NotebookPages(props: PagesViewProps) {
  const keyword = parseKeyword(useSearchParams().get("q") ?? undefined);
  return <PagesView {...props} keyword={keyword} />;
}
