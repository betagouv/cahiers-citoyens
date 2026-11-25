import type { Notebook } from "./domain";

// Forme des identifiants Condorcet :
// CC_<code postal>_<AAMMJJ d'ouverture>_<code INSEE>_MD_<numéro>.
// Le numéro dérive de l'index du cahier, ce qui rend l'identifiant unique.
export function sourceId(
  notebook: Notebook,
  postalCode: string,
  index: number,
): string {
  const opened = notebook.openedOn.replaceAll("-", "").slice(2);
  return `CC_${postalCode}_${opened}_${notebook.municipality.inseeCode}_MD_${10000 + index}`;
}
