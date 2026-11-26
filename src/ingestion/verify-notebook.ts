import type { NotebookFiles } from "./archive-contents";
import type { IngestError } from "./errors";
import { type Fingerprint, notebookFingerprint } from "./fingerprint";
import type { Notebook } from "./notebook";
import {
  imageFileErrors,
  matchPageImages,
  type VerifiedImage,
} from "./page-images";
import { parseNotebook } from "./parse-notebook";
import { polygonErrors } from "./polygon-bounds";

export interface VerifiedNotebook {
  notebook: Notebook;
  fingerprint: Fingerprint;
  // Une image par page, dans l'ordre des pages.
  images: VerifiedImage[];
}

export type NotebookVerification =
  | { ok: true; notebook: VerifiedNotebook }
  | { ok: false; errors: IngestError[] };

function orphanImages({ id, images }: NotebookFiles): IngestError[] {
  return images.map((image) => ({
    notebook: id,
    file: image.entryName,
    page: image.page,
    code: "unlisted-file",
    message: `Fichier en trop : aucun ${id}.json ne décrit le cahier de ${image.entryName}.`,
  }));
}

function fingerprintOf(
  notebook: Notebook,
  images: readonly VerifiedImage[],
): Fingerprint {
  return notebookFingerprint({
    metadata: notebook.metadata,
    pages: notebook.pages.map((page, i) => ({
      ...page,
      imageSha256: images[i].sha256,
    })),
  });
}

// Un JSON illisible ou refusé ne dit pas quelles pages existent : seuls les
// contrôles propres aux images s'ajoutent alors à ses erreurs. Une page en
// double n'entraîne donc ni image manquante ni fichier en trop.
export function verifyNotebook(files: NotebookFiles): NotebookVerification {
  const imageErrors = imageFileErrors(files);
  if (files.json === null) {
    return { ok: false, errors: [...orphanImages(files), ...imageErrors] };
  }
  if (files.json.text === null) {
    return { ok: false, errors: imageErrors };
  }
  const parsed = parseNotebook(files.id, files.json.text);
  if (!parsed.ok) {
    return { ok: false, errors: [...parsed.errors, ...imageErrors] };
  }
  const { notebook } = parsed;
  const matched = matchPageImages(notebook, files.images);
  const errors = [
    ...imageErrors,
    ...matched.errors,
    ...polygonErrors(notebook),
  ];
  // Une image illisible manque aussi à sa page ; son erreur est déjà au
  // rapport de lecture du ZIP.
  if (errors.length > 0 || matched.images.length < notebook.pages.length) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    notebook: {
      notebook,
      fingerprint: fingerprintOf(notebook, matched.images),
      images: matched.images,
    },
  };
}
