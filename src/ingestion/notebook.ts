import type { NotebookId } from "./notebook-id";

// Type du domaine d'un cahier, en anglais. Le JSON de Condorcet (champs en
// français) est converti en ce type par `parseNotebook`, à la frontière.

export type TranscriptionMethod = "automatic" | "manual";

export type LineKind = "handwritten" | "typed";

// Coordonnées en pixels de l'image de la page, origine en haut à gauche.
export type Point = [x: number, y: number];

// Anneaux d'un polygone GeoJSON : le premier est le contour, chacun est fermé.
export type Polygon = Point[][];

export interface NotebookMetadata {
  department: string;
  departmentCode: string;
  municipality: string;
  inseeCode: string;
  postalCode: string;
  typedTranscription: TranscriptionMethod;
  handwrittenTranscription: TranscriptionMethod;
}

export interface Line {
  id: string;
  kind: LineKind;
  // `null` quand Condorcet n'a pas renseigné la zone.
  zone: string | null;
  text: string;
  polygon: Polygon;
}

export interface Page {
  number: number;
  id: string;
  width: number;
  height: number;
  lines: Line[];
}

export interface Notebook {
  id: NotebookId;
  // Valeur opaque de Condorcet, gardée telle quelle.
  schemaVersion: string;
  metadata: NotebookMetadata;
  pages: Page[];
}
