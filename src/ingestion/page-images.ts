import type { ImageFile, NotebookFiles } from "./archive-contents";
import type { IngestError } from "./errors";
import type { Sha256 } from "./fingerprint";
import type { ImageType } from "./image-header";
import type { Notebook, Page } from "./notebook";

export interface VerifiedImage {
  page: number;
  // Nom du fichier dans le ZIP, pour le relire au moment de le publier.
  entryName: string;
  type: ImageType;
  sha256: Sha256;
  bytes: number;
  width: number;
  height: number;
}

export interface PageImages {
  errors: IngestError[];
  images: VerifiedImage[];
}

function byPage(images: readonly ImageFile[]): Map<number, ImageFile[]> {
  const pages = new Map<number, ImageFile[]>();
  for (const image of images) {
    pages.set(image.page, [...(pages.get(image.page) ?? []), image]);
  }
  return pages;
}

// Contrôles qui ne dépendent pas du JSON : une seule image par page, et
// chaque image est un JPEG ou un PNG lisible.
export function imageFileErrors({ id, images }: NotebookFiles): IngestError[] {
  const duplicates = [...byPage(images).values()].flatMap(([first, ...rest]) =>
    rest.map((image): IngestError => ({
      notebook: id,
      file: image.entryName,
      page: image.page,
      code: "duplicate-image",
      message: `${image.entryName} et ${first.entryName} sont deux images de la page ${image.page} : une seule est admise.`,
    })),
  );
  const invalid = images
    .filter(({ digest }) => digest !== null && digest.header === null)
    .map((image): IngestError => ({
      notebook: id,
      file: image.entryName,
      page: image.page,
      code: "invalid-image",
      message: `${image.entryName} n'est ni un JPEG ni un PNG lisible.`,
    }));
  return [...duplicates, ...invalid];
}

function pageImage(
  notebook: Notebook,
  page: Page,
  candidates: readonly ImageFile[],
): IngestError | VerifiedImage | null {
  if (candidates.length === 0) {
    return {
      notebook: notebook.id,
      file: `${notebook.id}.json`,
      page: page.number,
      code: "missing-image",
      message: `La page ${page.number} n'a pas d'image : ${page.id}.png, .jpg ou .jpeg attendu.`,
    };
  }
  const [image] = candidates;
  const header = image.digest?.header ?? null;
  // Plusieurs images ou une image illisible : déjà signalé.
  if (candidates.length > 1 || image.digest === null || header === null) {
    return null;
  }
  if (header.width !== page.width || header.height !== page.height) {
    return {
      notebook: notebook.id,
      file: image.entryName,
      page: page.number,
      code: "image-size-mismatch",
      message: `${image.entryName} mesure ${header.width} × ${header.height} pixels, le JSON annonce ${page.width} × ${page.height}.`,
    };
  }
  const { sha256, bytes } = image.digest;
  return {
    page: page.number,
    entryName: image.entryName,
    sha256,
    bytes,
    ...header,
  };
}

function unlistedImage(notebook: Notebook, image: ImageFile): IngestError {
  return {
    notebook: notebook.id,
    file: image.entryName,
    page: image.page,
    code: "unlisted-file",
    message: `Fichier en trop : ${image.entryName} est l'image d'une page ${image.page} que ${notebook.id}.json n'annonce pas.`,
  };
}

// Associe à chaque page déclarée son image, aux dimensions annoncées.
export function matchPageImages(
  notebook: Notebook,
  images: readonly ImageFile[],
): PageImages {
  const pages = byPage(images);
  const errors: IngestError[] = [];
  const verified: VerifiedImage[] = [];
  for (const page of notebook.pages) {
    const result = pageImage(notebook, page, pages.get(page.number) ?? []);
    if (result !== null && "code" in result) errors.push(result);
    else if (result !== null) verified.push(result);
  }
  const declared = new Set(notebook.pages.map(({ number }) => number));
  errors.push(
    ...images
      .filter(({ page }) => !declared.has(page))
      .map((image) => unlistedImage(notebook, image)),
  );
  return { errors, images: verified };
}
