import type {
  LineKind,
  Notebook,
  Point,
  TranscriptionMethod,
} from "./notebook";
import type { NotebookId } from "./notebook-id";

// Forme du JSON de Condorcet, telle que la décrit `schemas/notebook.schema.json`.
// Les noms de champs sont les leurs ; seul ce module les connaît.

export type RawTranscriptionMethod = "automatique" | "manuelle";

export type RawLineKind = "manuscrite" | "dactylographiee";

export interface RawLine {
  id_ligne: string;
  type_ligne: RawLineKind;
  type_zone: string;
  transcription: string;
  polygone: { type: "Polygon"; coordinates: Point[][] };
}

export interface RawPage {
  numero_page: number;
  id_page: string;
  largeur: number;
  hauteur: number;
  lignes: RawLine[];
}

export interface RawMetadata {
  departement: string;
  numero_departement: string;
  commune: string;
  code_insee: string;
  code_postal: string;
  type_transcription_dactylographiee: RawTranscriptionMethod;
  type_transcription_manuscrite: RawTranscriptionMethod;
}

export interface RawNotebook {
  schema_version: string;
  id_cahier: string;
  metadonnees: RawMetadata;
  pages: RawPage[];
}

export const UNSPECIFIED_ZONE = "non renseigné";

const TRANSCRIPTION_METHODS: Record<
  RawTranscriptionMethod,
  TranscriptionMethod
> = {
  automatique: "automatic",
  manuelle: "manual",
};

const LINE_KINDS: Record<RawLineKind, LineKind> = {
  manuscrite: "handwritten",
  dactylographiee: "typed",
};

export function toNotebook(id: NotebookId, raw: RawNotebook): Notebook {
  const metadata = raw.metadonnees;
  return {
    id,
    schemaVersion: raw.schema_version,
    metadata: {
      department: metadata.departement,
      departmentCode: metadata.numero_departement,
      municipality: metadata.commune,
      inseeCode: metadata.code_insee,
      postalCode: metadata.code_postal,
      typedTranscription:
        TRANSCRIPTION_METHODS[metadata.type_transcription_dactylographiee],
      handwrittenTranscription:
        TRANSCRIPTION_METHODS[metadata.type_transcription_manuscrite],
    },
    pages: raw.pages.map((page) => ({
      number: page.numero_page,
      id: page.id_page,
      width: page.largeur,
      height: page.hauteur,
      lines: page.lignes.map((line) => ({
        id: line.id_ligne,
        kind: LINE_KINDS[line.type_ligne],
        zone: line.type_zone === UNSPECIFIED_ZONE ? null : line.type_zone,
        text: line.transcription,
        polygon: line.polygone.coordinates,
      })),
    })),
  };
}
