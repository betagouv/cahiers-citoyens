import type { RawNotebook } from "../../src/ingestion/condorcet-notebook";
import {
  buildNotebookJson,
  imageName,
  type NotebookContent,
  serializeJson,
} from "./notebook-json";

export interface ArchiveEntry {
  path: string;
  bytes: Uint8Array;
  compress: boolean;
}

// Un cahier prêt à zipper, à plat à la racine du ZIP. `jsonBytes` remplace la
// sérialisation de `json` quand un défaut doit produire un JSON que le type
// RawNotebook ne peut pas décrire.
export interface NotebookDraft {
  id: string;
  json: RawNotebook;
  jsonBytes: Uint8Array | null;
  images: ArchiveEntry[];
  extras: ArchiveEntry[];
}

export function draftNotebook(content: NotebookContent): NotebookDraft {
  return {
    id: content.id,
    json: buildNotebookJson(content),
    jsonBytes: null,
    images: content.pages.map(({ number, image }) => ({
      path: imageName(content.id, number, image.extension),
      bytes: image.bytes,
      compress: false,
    })),
    extras: [],
  };
}

// Le JSON est compressé (Deflate) ; les images, déjà compressées, sont stockées.
export function draftEntries(draft: NotebookDraft): ArchiveEntry[] {
  return [
    {
      path: `${draft.id}.json`,
      bytes: draft.jsonBytes ?? serializeJson(draft.json),
      compress: true,
    },
    ...draft.images,
    ...draft.extras,
  ];
}
