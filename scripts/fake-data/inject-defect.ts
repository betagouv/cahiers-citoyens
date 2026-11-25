import type { RawPage } from "../../src/ingestion/condorcet-notebook";
import type { Defect } from "./defects";
import type { ArchiveEntry, NotebookDraft } from "./notebook-draft";
import { imageName, renumberPage, serializeJson } from "./notebook-json";

function textEntry(path: string, text: string): ArchiveEntry {
  return { path, bytes: new TextEncoder().encode(text), compress: true };
}

function withExtra(draft: NotebookDraft, extra: ArchiveEntry): NotebookDraft {
  return { ...draft, extras: [...draft.extras, extra] };
}

function withPages(draft: NotebookDraft, pages: RawPage[]): NotebookDraft {
  return { ...draft, json: { ...draft.json, pages } };
}

function last<T>(items: readonly T[]): T {
  return items[items.length - 1];
}

// Copie de la dernière image, sous le nom de la page `number`.
function lastImageAs(draft: NotebookDraft, number: number): ArchiveEntry {
  const image = last(draft.images);
  const extension = image.path.slice(image.path.lastIndexOf(".") + 1);
  return { ...image, path: imageName(draft.id, number, extension) };
}

// Une page de plus, numérotée après la dernière, glissée avant elle.
function decreasingPages(draft: NotebookDraft): NotebookDraft {
  const pages = draft.json.pages;
  const next = last(pages).numero_page + 1;
  const inserted = renumberPage(last(pages), draft.id, next);
  return {
    ...withPages(draft, [...pages.slice(0, -1), inserted, last(pages)]),
    images: [...draft.images, lastImageAs(draft, next)],
  };
}

function invalidPageId(draft: NotebookDraft): NotebookDraft {
  const [first, ...rest] = draft.json.pages;
  const badId = `${draft.id}_0${first.numero_page}`;
  return withPages(draft, [{ ...first, id_page: badId }, ...rest]);
}

function schemaViolation(draft: NotebookDraft): NotebookDraft {
  const pages = draft.json.pages.map(({ largeur, ...page }, i) =>
    i === 0 ? page : { ...page, largeur },
  );
  return { ...draft, jsonBytes: serializeJson({ ...draft.json, pages }) };
}

const INJECTORS: Record<Defect, (draft: NotebookDraft) => NotebookDraft> = {
  "missing-image": (draft) => ({ ...draft, images: draft.images.slice(0, -1) }),
  "unlisted-file": (draft) =>
    withExtra(
      draft,
      lastImageAs(draft, last(draft.json.pages).numero_page + 1),
    ),
  "duplicate-page": (draft) =>
    withPages(draft, [...draft.json.pages, last(draft.json.pages)]),
  "decreasing-pages": decreasingPages,
  "invalid-page-id": invalidPageId,
  "notebook-id-mismatch": (draft) => ({
    ...draft,
    json: { ...draft.json, id_cahier: `${draft.id}_bis` },
  }),
  "invalid-image": (draft) => {
    const [first, ...rest] = draft.images;
    const bytes = new TextEncoder().encode("Ceci n'est pas une image.\n");
    return { ...draft, images: [{ ...first, bytes }, ...rest] };
  },
  "invalid-json": (draft) => ({
    ...draft,
    jsonBytes: serializeJson(draft.json).slice(0, -3),
  }),
  "schema-violation": schemaViolation,
  "path-traversal": (draft) =>
    withExtra(draft, textEntry("../../escape.txt", "Hors du dépôt.\n")),
  "nested-folder": (draft) =>
    withExtra(draft, {
      ...draft.images[0],
      path: `scans/${draft.images[0].path}`,
    }),
};

export function injectDefect(
  draft: NotebookDraft,
  defect: Defect,
): NotebookDraft {
  return INJECTORS[defect](draft);
}
