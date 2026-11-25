import type { Defect } from "./defects";
import type { ArchiveEntry, NotebookDraft } from "./notebook-draft";
import { imageName, serializeJson } from "./notebook-json";

function textEntry(path: string, text: string): ArchiveEntry {
  return { path, bytes: new TextEncoder().encode(text), compress: true };
}

function withExtra(draft: NotebookDraft, extra: ArchiveEntry): NotebookDraft {
  return { ...draft, extras: [...draft.extras, extra] };
}

function lastPage(
  draft: NotebookDraft,
): NotebookDraft["json"]["pages"][number] {
  return draft.json.pages[draft.json.pages.length - 1];
}

function pageGap(draft: NotebookDraft): NotebookDraft {
  const last = lastPage(draft);
  const pages = [
    ...draft.json.pages.slice(0, -1),
    { ...last, page: last.page + 1 },
  ];
  return { ...draft, json: { ...draft.json, pages } };
}

function duplicatePage(draft: NotebookDraft): NotebookDraft {
  const image = imageName(draft.json.pages.length + 1);
  const lastImage = draft.images[draft.images.length - 1];
  return {
    ...draft,
    json: {
      ...draft.json,
      pages: [...draft.json.pages, { ...lastPage(draft), image }],
    },
    images: [...draft.images, { ...lastImage, path: `${draft.dir}/${image}` }],
  };
}

function invalidPng(draft: NotebookDraft): NotebookDraft {
  const [first, ...rest] = draft.images;
  const truncated = first.bytes.slice(0, Math.floor(first.bytes.length / 2));
  return { ...draft, images: [{ ...first, bytes: truncated }, ...rest] };
}

function schemaViolation(draft: NotebookDraft): NotebookDraft {
  const pages = draft.json.pages.map(({ page, image, text }, i) =>
    i === 0 ? { page, image } : { page, image, text },
  );
  return { ...draft, manifest: serializeJson({ ...draft.json, pages }) };
}

// Chaque défaut ne casse qu'un seul contrôle de la section 4 du protocole.
const INJECTORS: Record<Defect, (draft: NotebookDraft) => NotebookDraft> = {
  "missing-image": (draft) => ({ ...draft, images: draft.images.slice(0, -1) }),
  "unlisted-file": (draft) =>
    withExtra(
      draft,
      textEntry(`${draft.dir}/notes.txt`, "Fichier non annoncé.\n"),
    ),
  "page-gap": pageGap,
  "duplicate-page": duplicatePage,
  "invalid-png": invalidPng,
  "invalid-json": (draft) => ({
    ...draft,
    manifest: serializeJson(draft.json).slice(0, -3),
  }),
  "schema-violation": schemaViolation,
  "path-traversal": (draft) =>
    withExtra(
      draft,
      textEntry(`${draft.dir}/../../../escape.txt`, "Hors du dépôt.\n"),
    ),
  "nested-folder": (draft) =>
    withExtra(draft, {
      ...draft.images[0],
      path: `${draft.dir}/scans/${imageName(1)}`,
    }),
};

export function injectDefect(
  draft: NotebookDraft,
  defect: Defect,
): NotebookDraft {
  return INJECTORS[defect](draft);
}
