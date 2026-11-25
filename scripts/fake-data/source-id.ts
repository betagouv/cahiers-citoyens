import type { Notebook } from "./domain";
import { createRandom } from "./random";

// Forme des noms de l'inventaire : CC_<code INSEE>_<AAMMJJ d'ouverture>_<numéro>_MD_<lot>.
// Le numéro reprend l'index du cahier, ce qui rend l'identifiant unique dans un dépôt.
export function sourceId(
  notebook: Notebook,
  index: number,
  seed: string,
): string {
  const opened = notebook.openedOn.replaceAll("-", "").slice(2);
  const batch = createRandom(`${seed}:id:${index}`).int(10000, 99999);
  return `CC_${notebook.municipality.inseeCode}_${opened}_${String(index).padStart(5, "0")}_MD_${batch}`;
}
