import Ajv2020 from "ajv/dist/2020";
import { type RawNotebook, toNotebook } from "./condorcet-notebook";
import type { IngestError } from "./errors";
import type { Notebook } from "./notebook";
import { checkNotebook } from "./notebook-checks";
import type { NotebookId } from "./notebook-id";
import { schemaErrorToPageError } from "./schema-errors";
import notebookSchema from "./schemas/notebook.schema.json";

export type ParseNotebookResult =
  { ok: true; notebook: Notebook } | { ok: false; errors: IngestError[] };

const validateNotebook = new Ajv2020({ allErrors: true }).compile<RawNotebook>(
  notebookSchema,
);

function notebookFileName(id: NotebookId): string {
  return `${id}.json`;
}

// `id` vient du nom du fichier JSON, déjà validé par `parseNotebookId`.
export function parseNotebook(
  id: NotebookId,
  rawText: string,
): ParseNotebookResult {
  const file = notebookFileName(id);
  let data: unknown;
  try {
    data = JSON.parse(rawText);
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          notebook: id,
          file,
          code: "invalid-json",
          message: `${file} n'est pas un JSON valide (${String(error)}).`,
        },
      ],
    };
  }

  const checkErrors = checkNotebook(id, data);
  if (validateNotebook(data) && checkErrors.length === 0) {
    return { ok: true, notebook: toNotebook(id, data) };
  }

  const schemaErrors = (validateNotebook.errors ?? []).map(
    schemaErrorToPageError,
  );
  return {
    ok: false,
    errors: [...schemaErrors, ...checkErrors].map((error) => ({
      notebook: id,
      file,
      ...error,
    })),
  };
}
