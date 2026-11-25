export const NOTEBOOK_STATUSES = ["published", "withdrawn"] as const;

export type NotebookStatus = (typeof NOTEBOOK_STATUSES)[number];

// Motif d'un retrait, décidé de notre côté (`ingest withdraw`).
export const WITHDRAWAL_REASONS = [
  "not_publishable",
  "sensitive_content",
  "source_correction",
  "other",
] as const;

export type WithdrawalReason = (typeof WITHDRAWAL_REASONS)[number];
