import {
  type RawLine,
  type RawMetadata,
  type RawNotebook,
  type RawPage,
  UNSPECIFIED_ZONE,
} from "../../src/ingestion/condorcet-notebook";
import type { PageImage } from "./page-image";
import type { LineRole } from "./page-layout";
import { HEIGHT, WIDTH } from "./page-geometry";
import type { WrittenLine } from "./scan";

export const SCHEMA_VERSION = "Campus Condorcet";

export interface ContentPage {
  number: number;
  lines: WrittenLine[];
  image: PageImage;
}

export interface NotebookContent {
  id: string;
  metadata: RawMetadata;
  pages: ContentPage[];
}

const LINE_TYPES: Record<
  LineRole,
  Pick<RawLine, "type_ligne" | "type_zone">
> = {
  header: { type_ligne: "dactylographiee", type_zone: UNSPECIFIED_ZONE },
  body: { type_ligne: "manuscrite", type_zone: "Corps de la contribution" },
  signature: { type_ligne: "manuscrite", type_zone: "Signature" },
};

export function pageId(id: string, number: number): string {
  return `${id}_${number}`;
}

export function imageName(
  id: string,
  number: number,
  extension: string,
): string {
  return `${pageId(id, number)}.${extension}`;
}

function lineId(page: string, index: number): string {
  return `${page}_${index + 1}`;
}

// Change le numéro d'une page et les identifiants qui en dérivent.
export function renumberPage(
  page: RawPage,
  id: string,
  number: number,
): RawPage {
  const newPageId = pageId(id, number);
  return {
    ...page,
    numero_page: number,
    id_page: newPageId,
    lignes: page.lignes.map((line, i) => ({
      ...line,
      id_ligne: lineId(newPageId, i),
    })),
  };
}

function rawPage(id: string, { number, lines }: ContentPage): RawPage {
  const page = pageId(id, number);
  return {
    numero_page: number,
    id_page: page,
    largeur: WIDTH,
    hauteur: HEIGHT,
    lignes: lines.map(({ text, role, polygon }, i) => ({
      id_ligne: lineId(page, i),
      ...LINE_TYPES[role],
      transcription: text,
      polygone: { type: "Polygon", coordinates: polygon },
    })),
  };
}

export function buildNotebookJson(content: NotebookContent): RawNotebook {
  return {
    schema_version: SCHEMA_VERSION,
    id_cahier: content.id,
    metadonnees: content.metadata,
    pages: content.pages.map((page) => rawPage(content.id, page)),
  };
}

export function serializeJson(value: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`);
}
