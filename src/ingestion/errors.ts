export const INGEST_ERROR_CODES = [
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
] as const;

export type IngestErrorCode = (typeof INGEST_ERROR_CODES)[number];

export interface IngestError {
  notebook?: string;
  file?: string;
  page?: number;
  code: IngestErrorCode;
  message: string;
}

export type PageError = Pick<IngestError, "page" | "code" | "message">;
