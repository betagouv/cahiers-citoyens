import { and, asc, count, eq, max, min } from "drizzle-orm";
import { getDatabase } from "../db/client";
import { chunks, notebooks } from "../db/schema";

export const NOTEBOOKS_PAGE_SIZE = 20;

// `openedOn`, `transcription` et le scan ne viennent que de `scripts/load.ts` :
// un cahier venu d'un dépôt ne les a pas, ses pages s'afficheront en phase 8.
export interface NotebookSummary {
  id: string;
  openedOn: string | null;
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
  openedOn: string | null;
  transcription: string | null;
  hasScan: boolean;
  chunkCount: number;
}

export interface CorpusStats {
  notebookCount: number;
  chunkCount: number;
  embeddedChunkCount: number;
  firstOpenedOn: string | null;
  lastOpenedOn: string | null;
}

// Un cahier retiré disparaît du site.
const published = eq(notebooks.status, "published");

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
  const [{ total }] = await db
    .select({ total: count() })
    .from(notebooks)
    .where(published);
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
    .where(published)
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
      scanKey: notebooks.scanKey,
      chunkCount: count(chunks.id),
    })
    .from(notebooks)
    .leftJoin(chunks, eq(chunks.notebookId, notebooks.id))
    .where(and(eq(notebooks.id, id), published))
    .groupBy(notebooks.id);
  if (row === undefined) return undefined;
  const { scanKey, ...notebook } = row;
  return { ...notebook, hasScan: scanKey !== null };
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
    .where(and(eq(notebooks.id, id), published))
    .limit(1);
  return row !== undefined;
}

// `undefined` pour un cahier inconnu, retiré ou venu d'un dépôt (sans scan).
export async function getScanKey(id: string): Promise<string | undefined> {
  const [row] = await getDatabase()
    .select({ scanKey: notebooks.scanKey })
    .from(notebooks)
    .where(and(eq(notebooks.id, id), published));
  return row?.scanKey ?? undefined;
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
      .from(notebooks)
      .where(published),
    db
      .select({
        chunkCount: count(),
        embeddedChunkCount: count(chunks.embedding),
      })
      .from(chunks),
  ]);
  return { ...notebookStats, ...chunkStats };
}
