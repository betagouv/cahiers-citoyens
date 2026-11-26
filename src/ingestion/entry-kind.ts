import type { IngestError } from "./errors";
import { type NotebookId, parseNotebookId } from "./notebook-id";

export type EntryKind =
  | { kind: "json"; id: NotebookId }
  | { kind: "image"; id: NotebookId; page: number }
  | { kind: "rejected"; error: IngestError };

const JSON_NAME = /^(.+)\.json$/;
// Le numéro de page est le dernier `_<n>` : `X_16116_3.png` est la page 3 de `X_16116`.
const IMAGE_NAME = /^(.+)_([1-9][0-9]*)\.(png|jpg|jpeg)$/i;

function unlisted(name: string): EntryKind {
  return {
    kind: "rejected",
    error: {
      file: name,
      code: "unlisted-file",
      message: `Fichier en trop : ${name} n'est ni <id_cahier>.json ni une image <id_cahier>_<numero_page>.png, .jpg ou .jpeg.`,
    },
  };
}

// Rattache un fichier à son cahier d'après son seul nom, déjà contrôlé par
// `checkEntryHeader`.
export function entryKind(name: string): EntryKind {
  const json = JSON_NAME.exec(name);
  if (json !== null) {
    const id = parseNotebookId(json[1]);
    return id.ok
      ? { kind: "json", id: id.id }
      : { kind: "rejected", error: { ...id.error, file: name } };
  }
  const image = IMAGE_NAME.exec(name);
  if (image === null) {
    return unlisted(name);
  }
  const id = parseNotebookId(image[1]);
  const page = Number(image[2]);
  if (!id.ok || !Number.isSafeInteger(page)) {
    return unlisted(name);
  }
  return { kind: "image", id: id.id, page };
}
