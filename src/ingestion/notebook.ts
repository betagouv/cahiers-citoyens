import Ajv2020 from "ajv/dist/2020";
import type { IngestError } from "./errors";
import type { NotebookId } from "./notebook-id";
import { checkPageSequence } from "./page-sequence";
import { schemaErrorToPageError } from "./schema-errors";
import notebookSchema from "./schemas/notebook.schema.json";

export interface Page {
  page: number;
  image: string;
  text: string;
}

export interface NotebookManifest {
  sourceFilename: string;
  pipelineRelease: string;
  pages: Page[];
}

export type ParseNotebookManifestResult =
  | { ok: true; manifest: NotebookManifest }
  | { ok: false; errors: IngestError[] };

const NOTEBOOK_FILE = "notebook.json";

interface RawNotebook {
  format: 1;
  source_filename: string;
  pipeline_release: string;
  pages: Page[];
}

const validateNotebook = new Ajv2020({ allErrors: true }).compile<RawNotebook>(
  notebookSchema,
);

export function parseNotebookManifest(
  id: NotebookId,
  rawText: string,
): ParseNotebookManifestResult {
  let data: unknown;
  try {
    data = JSON.parse(rawText);
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          notebook: id,
          file: NOTEBOOK_FILE,
          code: "invalid-json",
          message: `${NOTEBOOK_FILE} n'est pas un JSON valide (${String(error)}).`,
        },
      ],
    };
  }

  const sequenceErrors = checkPageSequence(data);
  if (validateNotebook(data) && sequenceErrors.length === 0) {
    return {
      ok: true,
      manifest: {
        sourceFilename: data.source_filename,
        pipelineRelease: data.pipeline_release,
        pages: data.pages.map(({ page, image, text }) => ({
          page,
          image,
          text,
        })),
      },
    };
  }

  const schemaErrors = (validateNotebook.errors ?? []).map(
    schemaErrorToPageError,
  );
  return {
    ok: false,
    errors: [...schemaErrors, ...sequenceErrors].map((error) => ({
      notebook: id,
      file: NOTEBOOK_FILE,
      ...error,
    })),
  };
}
