import { describe, expect, it } from "vitest";
import type { IngestErrorCode } from "./errors";
import { parseNotebookManifest } from "./notebook";
import type { ParseNotebookManifestResult } from "./notebook";
import { parseNotebookId } from "./notebook-id";
import type { NotebookId } from "./notebook-id";

const PROTOCOL_EXAMPLE = `{
  "format": 1,
  "source_filename": "CC_01500_190318_01004_MD_16116.pdf",
  "pipeline_release": "condorcet-2026.10",
  "pages": [
    {
      "page": 1,
      "image": "0001.png",
      "text": "Délibération de l'assemblée…"
    },
    { "page": 2, "image": "0002.png", "text": "" },
    { "page": 3, "image": "0003.png", "text": "Suite du texte…" }
  ]
}`;

function notebookId(): NotebookId {
  const result = parseNotebookId("CC_01500_190318_01004_MD_16116");
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.id;
}

function parse(value: unknown): ParseNotebookManifestResult {
  return parseNotebookManifest(notebookId(), JSON.stringify(value));
}

function page(
  number: number,
  image = `${String(number).padStart(4, "0")}.png`,
) {
  return { page: number, image, text: `Texte ${number}` };
}

function notebook(overrides: Record<string, unknown> = {}) {
  return {
    format: 1,
    source_filename: "CC_00000_000000_00000_MD_00000.pdf",
    pipeline_release: "condorcet-test",
    pages: [page(1), page(2), page(3)],
    ...overrides,
  };
}

function withoutField(value: object, field: string) {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== field),
  );
}

function errorsOf(result: ParseNotebookManifestResult) {
  if (result.ok) {
    throw new Error("le parseur aurait dû refuser ce notebook.json");
  }
  return result.errors.map(({ code, page }) => ({ code, page }));
}

function only(code: IngestErrorCode, page?: number) {
  return [{ code, page }];
}

describe("parseNotebookManifest", () => {
  it("lit l'exemple du protocole", () => {
    const result = parseNotebookManifest(notebookId(), PROTOCOL_EXAMPLE);
    expect(result).toEqual({
      ok: true,
      manifest: {
        sourceFilename: "CC_01500_190318_01004_MD_16116.pdf",
        pipelineRelease: "condorcet-2026.10",
        pages: [
          { page: 1, image: "0001.png", text: "Délibération de l'assemblée…" },
          { page: 2, image: "0002.png", text: "" },
          { page: 3, image: "0003.png", text: "Suite du texte…" },
        ],
      },
    });
  });

  it("refuse un JSON invalide", () => {
    const result = parseNotebookManifest(notebookId(), '{ "format": 1,');
    expect(errorsOf(result)).toEqual(only("invalid-json"));
  });

  it("localise chaque erreur dans le cahier et le fichier", () => {
    const result = parse(notebook({ format: 2 }));
    expect(result).toMatchObject({
      ok: false,
      errors: [
        {
          notebook: "CC_01500_190318_01004_MD_16116",
          file: "notebook.json",
          code: "invalid-field",
        },
      ],
    });
  });

  it("refuse un champ manquant", () => {
    const value = withoutField(notebook(), "pipeline_release");
    expect(errorsOf(parse(value))).toEqual(only("missing-field"));
  });

  it("refuse un champ manquant dans une page", () => {
    const pages = [page(1), { page: 2, image: "0002.png" }, page(3)];
    expect(errorsOf(parse(notebook({ pages })))).toEqual(
      only("missing-field", 2),
    );
  });

  it("refuse un champ en trop", () => {
    expect(errorsOf(parse(notebook({ created_at: "2026-11-24" })))).toEqual(
      only("unknown-field"),
    );
  });

  it("refuse un champ en trop dans une page", () => {
    const pages = [page(1), page(2), { ...page(3), width: 1000 }];
    expect(errorsOf(parse(notebook({ pages })))).toEqual(
      only("unknown-field", 3),
    );
  });

  it("refuse un format autre que 1", () => {
    expect(errorsOf(parse(notebook({ format: 2 })))).toEqual(
      only("invalid-field"),
    );
  });

  it.each(["0002.jpg", "../0002.png", "pages/0002.png", "0002 .png"])(
    "refuse le nom d'image %s",
    (image) => {
      const pages = [page(1), page(2, image), page(3)];
      expect(errorsOf(parse(notebook({ pages })))).toEqual(
        only("invalid-field", 2),
      );
    },
  );

  it("refuse une liste de pages vide", () => {
    expect(errorsOf(parse(notebook({ pages: [] })))).toEqual(
      only("invalid-field"),
    );
  });

  it("refuse une page manquante", () => {
    const pages = [page(1), page(3)];
    expect(errorsOf(parse(notebook({ pages })))).toEqual(
      only("page-out-of-sequence", 2),
    );
  });

  it("refuse une page en double", () => {
    const pages = [page(1), page(2), page(2, "0002-bis.png")];
    expect(errorsOf(parse(notebook({ pages })))).toEqual(
      only("page-out-of-sequence", 3),
    );
  });

  it("refuse des pages dans le désordre", () => {
    const pages = [page(1), page(3), page(2)];
    expect(errorsOf(parse(notebook({ pages })))).toEqual([
      { code: "page-out-of-sequence", page: 2 },
      { code: "page-out-of-sequence", page: 3 },
    ]);
  });

  it("refuse une image citée deux fois", () => {
    const pages = [page(1), page(2), page(3, "0001.png")];
    expect(errorsOf(parse(notebook({ pages })))).toEqual(
      only("duplicate-image", 3),
    );
  });

  it("liste toutes les erreurs ensemble", () => {
    const pages = [
      page(1),
      { page: 3, image: "0003.png" },
      page(4, "0001.png"),
      { ...page(4), image: "4.jpg" },
    ];
    const value = notebook({ format: 2, extra: true, pages });
    expect(errorsOf(parse(value))).toEqual([
      { code: "unknown-field", page: undefined },
      { code: "invalid-field", page: undefined },
      { code: "missing-field", page: 2 },
      { code: "invalid-field", page: 4 },
      { code: "page-out-of-sequence", page: 2 },
      { code: "page-out-of-sequence", page: 3 },
      { code: "duplicate-image", page: 3 },
    ]);
  });

  it("écrit des messages en français", () => {
    const result = parse(withoutField(notebook(), "source_filename"));
    expect(result).toMatchObject({
      ok: false,
      errors: [{ message: "Champ obligatoire manquant : source_filename." }],
    });
  });
});
