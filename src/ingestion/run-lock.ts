import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Une seule exécution du job à la fois : deux applications concurrentes
// pourraient réécrire les images d'une version qu'une autre vient de publier.
export interface RunLock {
  // false si une autre exécution tient le verrou ; n'attend pas.
  tryAcquire(): Promise<boolean>;
  release(): Promise<void>;
}

// Clé du verrou consultatif, propre au job `ingest`.
export const INGEST_LOCK_KEY = 7_202_611;

// Verrou consultatif de session, sur une connexion à part : un verrou de
// session appartient à la connexion qui l'a pris, et le pool de la base peut
// en changer d'une requête à l'autre. Fermer la connexion le libère, même si
// le processus s'arrête avant `release`.
export function createAdvisoryLock(url: string): RunLock {
  const client = postgres(url, { max: 1 });
  const db = drizzle(client);
  return {
    async tryAcquire() {
      const [row] = await db.execute<{ locked: boolean }>(
        sql`select pg_try_advisory_lock(${INGEST_LOCK_KEY}) as locked`,
      );
      return row?.locked === true;
    },
    async release() {
      await client.end();
    },
  };
}
