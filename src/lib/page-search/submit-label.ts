import { formatNumber } from "@/lib/format";

// Ce que le bouton du formulaire sait des pages qu'il va montrer.
export type PageCountState =
  | { status: "unknown" }
  | { status: "loading" }
  | { status: "known"; pageCount: number };

// « Rechercher » tant qu'aucun nombre n'est connu ou qu'il est nul, puis
// « Voir la page » ou « Voir les 286 pages ». Pendant le calcul, « Voir les
// pages » garde la largeur du bouton à peu près stable.
export function submitLabel(state: PageCountState): string {
  switch (state.status) {
    case "unknown":
      return "Rechercher";
    case "loading":
      return "Voir les pages";
    case "known":
      if (state.pageCount === 0) return "Rechercher";
      if (state.pageCount === 1) return "Voir la page";
      return `Voir les ${formatNumber(state.pageCount)} pages`;
  }
}
