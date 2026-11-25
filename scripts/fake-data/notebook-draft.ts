import {
  buildNotebookJson,
  imageName,
  type NotebookJson,
  serializeJson,
} from "./notebook-json";

export interface ArchiveEntry {
  path: string;
  bytes: Uint8Array;
  compress: boolean;
}

export interface NotebookPage {
  text: string;
  png: Uint8Array;
}

export interface NotebookContent {
  id: string;
  pages: NotebookPage[];
}

// Un cahier prêt à zipper. `manifest` remplace la sérialisation de `json` quand un
// défaut doit produire un notebook.json que le type NotebookJson ne peut pas décrire.
export interface NotebookDraft {
  dir: string;
  json: NotebookJson;
  manifest: Uint8Array | null;
  images: ArchiveEntry[];
  extras: ArchiveEntry[];
}

export function draftNotebook(content: NotebookContent): NotebookDraft {
  const dir = `notebooks/${content.id}`;
  return {
    dir,
    json: buildNotebookJson(
      content.id,
      content.pages.map(({ text }) => text),
    ),
    manifest: null,
    images: content.pages.map(({ png }, i) => ({
      path: `${dir}/${imageName(i + 1)}`,
      bytes: png,
      compress: false,
    })),
    extras: [],
  };
}

export function draftEntries(draft: NotebookDraft): ArchiveEntry[] {
  return [
    {
      path: `${draft.dir}/notebook.json`,
      bytes: draft.manifest ?? serializeJson(draft.json),
      compress: true,
    },
    ...draft.images,
    ...draft.extras,
  ];
}
