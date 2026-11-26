import type { ImageType } from "./image-header";
import type { ImageContentType } from "./notebook";

const EXTENSIONS: Readonly<Record<ImageType, string>> = {
  jpeg: "jpg",
  png: "png",
};

export const IMAGE_CONTENT_TYPE: Readonly<Record<ImageType, ImageContentType>> =
  {
    jpeg: "image/jpeg",
    png: "image/png",
  };

// Clé de l'image d'une page, relative au préfixe du bucket. Elle ne dépend que
// du cahier, de la version et de la page : une copie interrompue se relance
// sur les mêmes clés. L'extension suit le type lu dans l'image, pas le nom du
// fichier livré (un JPEG nommé `.png` devient `.jpg`).
export function pageImageKey(
  notebookId: string,
  version: number,
  page: number,
  type: ImageType,
): string {
  return `notebooks/${notebookId}/v${version}/${page}.${EXTENSIONS[type]}`;
}
