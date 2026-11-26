export const INGEST_ERROR_CODES = [
  // JSON d'un cahier (phase 2).
  "invalid-notebook-id",
  "invalid-json",
  "missing-field",
  "unknown-field",
  "invalid-field",
  "notebook-id-mismatch",
  "duplicate-page",
  "page-out-of-order",
  "invalid-page-id",
  "invalid-line-id",
  // Dépôt et fichiers du ZIP (phase 4).
  "invalid-delivery-name",
  "unreadable-archive",
  "empty-delivery",
  "invalid-entry-name",
  "nested-entry",
  "symlink-entry",
  "duplicate-entry",
  "unsupported-entry",
  "corrupt-entry",
  "json-too-large",
  "unlisted-file",
  "missing-image",
  "duplicate-image",
  "invalid-image",
  "image-size-mismatch",
  "polygon-out-of-page",
] as const;

export type IngestErrorCode = (typeof INGEST_ERROR_CODES)[number];

// `page` est le numéro de page (`numero_page`, ou celui du nom de l'image).
// `position` est le rang de la page dans la liste `pages` du JSON, à partir
// de 1 : une erreur du JSON l'indique, car le numéro peut y être invalide.
export interface IngestError {
  notebook?: string;
  file?: string;
  page?: number;
  position?: number;
  code: IngestErrorCode;
  message: string;
}

export type PageError = Pick<
  IngestError,
  "page" | "position" | "code" | "message"
>;
