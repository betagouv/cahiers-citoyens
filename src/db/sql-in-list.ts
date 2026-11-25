import { type SQL, sql } from "drizzle-orm";

function quote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

// Liste SQL littérale `('a', 'b')` pour une contrainte CHECK. Les valeurs sont
// des constantes du code, jamais une saisie : une migration ne prend pas de
// paramètre.
export function sqlInList(values: readonly string[]): SQL {
  return sql.raw(`(${values.map(quote).join(", ")})`);
}
