import type { ImageFile, NotebookFiles } from "./archive-contents";
import { toNotebook } from "./condorcet-notebook";
import { parseSha256, type Sha256 } from "./fingerprint";
import type { ImageHeader } from "./image-header";
import type { Notebook } from "./notebook";
import { type NotebookId, parseNotebookId } from "./notebook-id";
import { EXAMPLE_ID, exampleNotebook } from "./test-notebook";

export function notebookIdOf(value: string): NotebookId {
  const id = parseNotebookId(value);
  if (!id.ok) throw new Error(id.error.message);
  return id.id;
}

export function exampleId(): NotebookId {
  return notebookIdOf(EXAMPLE_ID);
}

export function example(): Notebook {
  return toNotebook(exampleId(), exampleNotebook());
}

export function fakeSha256(seed: number): Sha256 {
  const value = parseSha256(seed.toString(16).padStart(64, "0"));
  if (value === undefined) throw new Error("SHA-256 invalide");
  return value;
}

const PAGE: ImageHeader = { type: "jpeg", width: 2484, height: 3507 };

// Image de la page `page` de l'exemple ; `header: null` pour un contenu illisible.
export function imageFile(
  page: number,
  extension = "png",
  header: ImageHeader | null = PAGE,
): ImageFile {
  return {
    entryName: `${EXAMPLE_ID}_${page}.${extension}`,
    page,
    digest: { sha256: fakeSha256(page), bytes: 1000 + page, header },
  };
}

export function exampleFiles(
  images: ImageFile[] = [imageFile(1), imageFile(3)],
  text: string | null = JSON.stringify(exampleNotebook()),
): NotebookFiles {
  return {
    id: exampleId(),
    json: { entryName: `${EXAMPLE_ID}.json`, text },
    images,
  };
}
