import { notebookFingerprint } from "./fingerprint";
import type { ImageType } from "./image-header";
import { EXAMPLE_ID } from "./test-notebook";
import { example, fakeSha256 } from "./test-files";
import type { VerifiedImage } from "./page-images";
import type { VerifiedNotebook } from "./verify-notebook";

function image(page: number, type: ImageType): VerifiedImage {
  return {
    page,
    entryName: `${EXAMPLE_ID}_${page}.png`,
    type,
    sha256: fakeSha256(page),
    bytes: 1000 + page,
    width: 2484,
    height: 3507,
  };
}

// L'exemple du protocole tel que la vérification le rend : page 1 en JPEG
// nommé `.png`, page 3 en vrai PNG. Changer la commune change l'empreinte.
export function verifiedExample(
  municipality = "Exempleville",
): VerifiedNotebook {
  const notebook = example();
  notebook.metadata.municipality = municipality;
  const images = [image(1, "jpeg"), image(3, "png")];
  return {
    notebook,
    images,
    fingerprint: notebookFingerprint({
      metadata: notebook.metadata,
      pages: notebook.pages.map((page, i) => ({
        ...page,
        imageSha256: images[i].sha256,
      })),
    }),
  };
}
