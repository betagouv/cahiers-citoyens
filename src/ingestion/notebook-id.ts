import type { IngestError } from "./errors";

export type NotebookId = string & { readonly __brand: "NotebookId" };

export type ParseNotebookIdResult =
  { ok: true; id: NotebookId } | { ok: false; error: IngestError };

const NOTEBOOK_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const NOTEBOOK_ID_MAX_LENGTH = 200;

function isNotebookId(value: string): value is NotebookId {
  return (
    value.length <= NOTEBOOK_ID_MAX_LENGTH && NOTEBOOK_ID_PATTERN.test(value)
  );
}

// L'identifiant est le nom du fichier JSON du cahier, sans l'extension `.json`.
export function parseNotebookId(baseName: string): ParseNotebookIdResult {
  if (isNotebookId(baseName)) {
    return { ok: true, id: baseName };
  }
  return {
    ok: false,
    error: {
      notebook: baseName,
      code: "invalid-notebook-id",
      message: `Nom de fichier invalide : ${NOTEBOOK_ID_MAX_LENGTH} caractères au plus, uniquement des lettres sans accent, des chiffres, « . », « _ » et « - », en commençant par une lettre ou un chiffre.`,
    },
  };
}
