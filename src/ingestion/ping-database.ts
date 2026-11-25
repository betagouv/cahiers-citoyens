import { type SQL, sql } from "drizzle-orm";

export interface PingableDatabase {
  execute(query: SQL): PromiseLike<unknown>;
  $client: { end(): Promise<void> };
}

export async function pingDatabase(database: PingableDatabase): Promise<void> {
  try {
    await database.execute(sql`select 1`);
  } finally {
    await database.$client.end();
  }
}
