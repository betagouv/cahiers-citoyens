import type { IngestError } from "./errors";
import type { Notebook, Page, Point } from "./notebook";

function outside(page: Page, [x, y]: Point): boolean {
  return x > page.width || y > page.height;
}

// Le schéma impose déjà des coordonnées positives : reste à vérifier que
// chaque point tient dans [0, largeur] × [0, hauteur].
export function polygonErrors(notebook: Notebook): IngestError[] {
  const file = `${notebook.id}.json`;
  return notebook.pages.flatMap((page) =>
    page.lines.flatMap((line): IngestError[] => {
      const point = line.polygon.flat().find((p) => outside(page, p));
      if (point === undefined) {
        return [];
      }
      return [
        {
          notebook: notebook.id,
          file,
          page: page.number,
          code: "polygon-out-of-page",
          message: `Le polygone de la ligne ${line.id} sort de la page (${page.width} × ${page.height} pixels) : point (${point[0]}, ${point[1]}).`,
        },
      ];
    }),
  );
}
