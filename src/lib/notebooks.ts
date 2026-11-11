import { asc, count, eq, max, min } from "drizzle-orm";
import { getDatabase } from "../db/client";
import { chunks, notebooks } from "../db/schema";

export const NOTEBOOKS_PAGE_SIZE = 20;

export interface NotebookSummary {
  id: string;
  openedOn: string;
  chunkCount: number;
}

export interface NotebookPage {
  notebooks: NotebookSummary[];
  page: number;
  pageCount: number;
  total: number;
}

export interface Notebook {
  id: string;
  openedOn: string;
  transcription: string;
  chunkCount: number;
}

export interface CorpusStats {
  notebookCount: number;
  chunkCount: number;
  embeddedChunkCount: number;
  firstOpenedOn: string | null;
  lastOpenedOn: string | null;
}

// `?page=` vient de l'URL : toute valeur autre qu'un entier ≥ 1 ramène à la page 1.
export function parsePageNumber(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || !/^\d+$/.test(value)) return 1;
  return Math.max(1, Number(value));
}

export async function listNotebooks(
  requestedPage: number,
): Promise<NotebookPage> {
  const db = getDatabase();
  const [{ total }] = await db.select({ total: count() }).from(notebooks);
  const pageCount = Math.max(1, Math.ceil(total / NOTEBOOKS_PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const rows = await db
    .select({
      id: notebooks.id,
      openedOn: notebooks.openedOn,
      chunkCount: count(chunks.id),
    })
    .from(notebooks)
    .leftJoin(chunks, eq(chunks.notebookId, notebooks.id))
    .groupBy(notebooks.id)
    .orderBy(asc(notebooks.id))
    .limit(NOTEBOOKS_PAGE_SIZE)
    .offset((page - 1) * NOTEBOOKS_PAGE_SIZE);
  return { notebooks: rows, page, pageCount, total };
}

export async function getNotebook(id: string): Promise<Notebook | undefined> {
  const [row] = await getDatabase()
    .select({
      id: notebooks.id,
      openedOn: notebooks.openedOn,
      transcription: notebooks.transcription,
      chunkCount: count(chunks.id),
    })
    .from(notebooks)
    .leftJoin(chunks, eq(chunks.notebookId, notebooks.id))
    .where(eq(notebooks.id, id))
    .groupBy(notebooks.id);
  return row;
}

// `<id>` décodé d'un chemin `/notebooks/<id>`, undefined pour tout autre chemin.
export function notebookIdFromPath(pathname: string): string | undefined {
  const match = /^\/notebooks\/([^/]+)$/.exec(pathname);
  if (match === null) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
}

export async function notebookExists(id: string): Promise<boolean> {
  const [row] = await getDatabase()
    .select({ id: notebooks.id })
    .from(notebooks)
    .where(eq(notebooks.id, id))
    .limit(1);
  return row !== undefined;
}

export async function getScanKey(id: string): Promise<string | undefined> {
  const [row] = await getDatabase()
    .select({ scanKey: notebooks.scanKey })
    .from(notebooks)
    .where(eq(notebooks.id, id));
  return row?.scanKey;
}

export async function getCorpusStats(): Promise<CorpusStats> {
  const db = getDatabase();
  const [[notebookStats], [chunkStats]] = await Promise.all([
    db
      .select({
        notebookCount: count(),
        firstOpenedOn: min(notebooks.openedOn),
        lastOpenedOn: max(notebooks.openedOn),
      })
      .from(notebooks),
    db
      .select({
        chunkCount: count(),
        embeddedChunkCount: count(chunks.embedding),
      })
      .from(chunks),
  ]);
  return { ...notebookStats, ...chunkStats };
}
