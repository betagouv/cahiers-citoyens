import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Database, Transaction } from "../db/client";
import { notebooks, notebookVersions, pages } from "../db/schema";
import type { NotebookState } from "./plan";

const online = alias(notebookVersions, "online");

function notebookRows(db: Database | Transaction, ids: readonly string[]) {
  return db
    .select({
      id: notebooks.id,
      status: notebooks.status,
      onlineVersion: notebooks.onlineVersion,
      fingerprint: online.fingerprint,
      latestVersion:
        sql<number>`(select coalesce(max(${notebookVersions.version}), 0) from ${notebookVersions} where ${notebookVersions.notebookId} = ${notebooks.id})`.mapWith(
          Number,
        ),
    })
    .from(notebooks)
    .leftJoin(
      online,
      and(
        eq(online.notebookId, notebooks.id),
        eq(online.version, notebooks.onlineVersion),
      ),
    )
    .where(inArray(notebooks.id, [...ids]))
    .orderBy(asc(notebooks.id));
}

// État en base des cahiers `ids` ; un cahier inconnu n'y figure pas. Avec
// `lock`, dans une transaction, les lignes de `notebooks` restent verrouillées
// jusqu'au commit (`FOR UPDATE`), dans l'ordre des identifiants pour éviter
// tout interblocage entre deux traitements.
export async function readNotebookStates(
  db: Database | Transaction,
  ids: readonly string[],
  lock: boolean,
): Promise<Map<string, NotebookState>> {
  const query = notebookRows(db, ids);
  const rows = await (lock ? query.for("update", { of: notebooks }) : query);
  const images = await db
    .select({ notebookId: pages.notebookId, imageKey: pages.imageKey })
    .from(pages)
    .where(inArray(pages.notebookId, [...ids]))
    .orderBy(asc(pages.notebookId), asc(pages.number));
  return new Map(
    rows.map(({ id, ...state }) => [
      id,
      {
        ...state,
        imageKeys: images
          .filter(({ notebookId }) => notebookId === id)
          .map(({ imageKey }) => imageKey),
      },
    ]),
  );
}
