import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export function createDatabase(url: string) {
  return drizzle(postgres(url));
}

export type Database = ReturnType<typeof createDatabase>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

let database: Database | undefined;

// Ouverte à la première requête, jamais au build : `next build` tourne sans base.
export function getDatabase(): Database {
  if (database === undefined) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL est obligatoire");
    database = createDatabase(url);
  }
  return database;
}
