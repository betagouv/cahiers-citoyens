// Lignes d'un insert découpées par lots : Postgres admet au plus 65 535
// paramètres par requête, et un cahier de plusieurs centaines de pages a des
// milliers de lignes de transcription.
export const BATCH_SIZE = 1000;

export function batches<T>(rows: readonly T[], size = BATCH_SIZE): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < rows.length; start += size) {
    result.push(rows.slice(start, start + size));
  }
  return result;
}
