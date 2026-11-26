import type {
  chunks,
  lines,
  notebookVersions,
  notebooks,
  pages,
} from "../db/schema";
import { chunkPages, pageText } from "./chunk-pages";
import type { WriteChange } from "./plan";

export interface NotebookRows {
  version: typeof notebookVersions.$inferInsert;
  notebook: Omit<typeof notebooks.$inferInsert, "id" | "importedAt">;
  pages: (typeof pages.$inferInsert)[];
  lines: (typeof lines.$inferInsert)[];
  chunks: (typeof chunks.$inferInsert)[];
}

function pageRows({ verified, uploads }: WriteChange): NotebookRows["pages"] {
  const { id, pages: notebookPages } = verified.notebook;
  return notebookPages.map((page, i) => ({
    notebookId: id,
    number: page.number,
    imageKey: uploads[i].key,
    imageContentType: uploads[i].contentType,
    width: page.width,
    height: page.height,
    text: pageText(page),
  }));
}

function lineRows({ verified }: WriteChange): NotebookRows["lines"] {
  const { id, pages: notebookPages } = verified.notebook;
  return notebookPages.flatMap((page) =>
    page.lines.map((line, i) => ({
      notebookId: id,
      page: page.number,
      position: i + 1,
      kind: line.kind,
      zone: line.zone,
      text: line.text,
      polygon: line.polygon,
    })),
  );
}

// Lignes à écrire pour la nouvelle version d'un cahier. Le cahier repasse
// `published`, sans trace de retrait, et perd les colonnes de `scripts/load.ts` :
// ses pages les remplacent. Les chunks partent sans embedding : la
// vectorisation les reprend ensuite (`embedPendingChunks`).
export function notebookRows(
  change: WriteChange,
  deliveryId: number,
): NotebookRows {
  const { notebook, fingerprint } = change.verified;
  const { metadata } = notebook;
  return {
    version: {
      notebookId: notebook.id,
      version: change.version,
      deliveryId,
      fingerprint,
      schemaVersion: notebook.schemaVersion,
      pageCount: notebook.pages.length,
    },
    notebook: {
      status: "published",
      onlineVersion: change.version,
      withdrawalReason: null,
      withdrawnAt: null,
      openedOn: null,
      scanKey: null,
      transcriptionKey: null,
      transcription: null,
      departmentName: metadata.department,
      departmentCode: metadata.departmentCode,
      municipalityName: metadata.municipality,
      inseeCode: metadata.inseeCode,
      postalCode: metadata.postalCode,
      typedTranscription: metadata.typedTranscription,
      handwrittenTranscription: metadata.handwrittenTranscription,
    },
    pages: pageRows(change),
    lines: lineRows(change),
    chunks: chunkPages(notebook.pages).map((chunk, i) => ({
      notebookId: notebook.id,
      position: i + 1,
      ...chunk,
    })),
  };
}
