import { and, asc, count, eq } from "drizzle-orm";
import { cache } from "react";
import { getDatabase } from "../db/client";
import { notebooks, pages } from "../db/schema";

export const NOTEBOOKS_PAGE_SIZE = 20;

// Commune et département d'un cahier, tels que livrés par Condorcet. Vides
// pour un cahier chargé avant les dépôts.
export interface NotebookPlace {
  municipalityName: string | null;
  departmentName: string | null;
  departmentCode: string | null;
}

export interface NotebookSummary extends NotebookPlace {
  id: string;
  pageCount: number;
}

export interface NotebookList {
  notebooks: NotebookSummary[];
  page: number;
  pageCount: number;
  total: number;
}

export interface PageContent {
  number: number;
  width: number;
  height: number;
  text: string;
}

export interface Notebook extends NotebookPlace {
  id: string;
  // Vide, et `pages` aussi, pour un cahier chargé avant les dépôts.
  onlineVersion: number | null;
  pages: PageContent[];
}

// Un cahier retiré disparaît du site.
const published = eq(notebooks.status, "published");

const placeColumns = {
  municipalityName: notebooks.municipalityName,
  departmentName: notebooks.departmentName,
  departmentCode: notebooks.departmentCode,
};

// `?page=` vient de l'URL : toute valeur autre qu'un entier ≥ 1 ramène à la page 1.
export function parsePageNumber(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || !/^\d+$/.test(value)) return 1;
  return Math.max(1, Number(value));
}

export async function listNotebooks(
  requestedPage: number,
): Promise<NotebookList> {
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
      ...placeColumns,
      pageCount: count(pages.number),
    })
    .from(notebooks)
    .leftJoin(pages, eq(pages.notebookId, notebooks.id))
    .where(published)
    .groupBy(notebooks.id)
    .orderBy(asc(notebooks.id))
    .limit(NOTEBOOKS_PAGE_SIZE)
    .offset((page - 1) * NOTEBOOKS_PAGE_SIZE);
  return { notebooks: rows, page, pageCount, total };
}

// Le cahier et ses pages, lus en parallèle. Mis en cache le temps d'une
// requête : les métadonnées et la page le lisent toutes deux.
export const getNotebook = cache(async function getNotebook(
  id: string,
): Promise<Notebook | undefined> {
  const db = getDatabase();
  const [[row], pageRows] = await Promise.all([
    db
      .select({
        id: notebooks.id,
        onlineVersion: notebooks.onlineVersion,
        ...placeColumns,
      })
      .from(notebooks)
      .where(and(eq(notebooks.id, id), published)),
    db
      .select({
        number: pages.number,
        width: pages.width,
        height: pages.height,
        text: pages.text,
      })
      .from(pages)
      .innerJoin(notebooks, eq(notebooks.id, pages.notebookId))
      .where(and(eq(pages.notebookId, id), published))
      .orderBy(asc(pages.number)),
  ]);
  if (row === undefined) return undefined;
  return { ...row, pages: pageRows };
});

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
