import { describe, expect, it } from "vitest";
import { injectDefect } from "./inject-defect";
import {
  draftEntries,
  draftNotebook,
  type NotebookDraft,
} from "./notebook-draft";
import { testContent } from "./test-notebook";

const CONTENT = testContent();
const FIRST = CONTENT.pages[0].image.bytes;
const LAST = CONTENT.pages[2].image.bytes;
const BASE = draftNotebook(CONTENT);

function paths(draft: NotebookDraft): string[] {
  return draftEntries(draft).map(({ path }) => path);
}

function jsonText(draft: NotebookDraft): string {
  return new TextDecoder().decode(draftEntries(draft)[0].bytes);
}

function pageIds(draft: NotebookDraft): [number, string, string[]][] {
  return draft.json.pages.map((page) => [
    page.numero_page,
    page.id_page,
    page.lignes.map(({ id_ligne }) => id_ligne),
  ]);
}

describe("injectDefect, fichiers", () => {
  it("missing-image : l'image de la dernière page manque", () => {
    const draft = injectDefect(BASE, "missing-image");
    expect(paths(draft)).toEqual(["CC_1.json", "CC_1_1.png", "CC_1_2.png"]);
    expect(draft.json).toEqual(BASE.json);
  });

  it("unlisted-file : l'image d'une page absente du JSON s'ajoute", () => {
    const draft = injectDefect(BASE, "unlisted-file");
    expect(paths(draft)).toEqual([...paths(BASE), "CC_1_6.png"]);
    expect(draft.extras[0]).toEqual({
      path: "CC_1_6.png",
      bytes: LAST,
      compress: false,
    });
  });

  it("invalid-image : la première image n'est ni un JPEG ni un PNG", () => {
    const draft = injectDefect(BASE, "invalid-image");
    expect(new TextDecoder().decode(draft.images[0].bytes)).toBe(
      "Ceci n'est pas une image.\n",
    );
    expect(draft.images[0].path).toBe("CC_1_1.png");
    expect(draft.images.slice(1)).toEqual(BASE.images.slice(1));
  });

  it("path-traversal : une entrée remonte hors du dépôt", () => {
    expect(injectDefect(BASE, "path-traversal").extras).toEqual([
      {
        path: "../../escape.txt",
        bytes: new TextEncoder().encode("Hors du dépôt.\n"),
        compress: true,
      },
    ]);
  });

  it("nested-folder : une image apparaît dans un sous-dossier", () => {
    expect(injectDefect(BASE, "nested-folder").extras).toEqual([
      { path: "scans/CC_1_1.png", bytes: FIRST, compress: false },
    ]);
  });
});

describe("injectDefect, pages", () => {
  it("duplicate-page : la dernière page revient sous le même numéro", () => {
    const draft = injectDefect(BASE, "duplicate-page");
    expect(pageIds(draft)).toEqual([...pageIds(BASE), pageIds(BASE)[2]]);
    expect(paths(draft)).toEqual(paths(BASE));
  });

  it("decreasing-pages : une page 6 s'insère avant la page 5, avec son image", () => {
    const draft = injectDefect(BASE, "decreasing-pages");
    expect(pageIds(draft)).toEqual([
      [1, "CC_1_1", ["CC_1_1_1", "CC_1_1_2"]],
      [2, "CC_1_2", []],
      [6, "CC_1_6", ["CC_1_6_1"]],
      [5, "CC_1_5", ["CC_1_5_1"]],
    ]);
    expect(draft.images[3]).toEqual({
      path: "CC_1_6.png",
      bytes: LAST,
      compress: false,
    });
  });

  it("invalid-page-id : la première page porte un id_page mal formé", () => {
    const draft = injectDefect(BASE, "invalid-page-id");
    expect(pageIds(draft)[0]).toEqual([1, "CC_1_01", ["CC_1_1_1", "CC_1_1_2"]]);
    expect(pageIds(draft).slice(1)).toEqual(pageIds(BASE).slice(1));
  });

  it("notebook-id-mismatch : id_cahier ne reprend plus le nom du fichier", () => {
    const draft = injectDefect(BASE, "notebook-id-mismatch");
    expect(draft.json.id_cahier).toBe("CC_1_bis");
    expect(paths(draft)).toEqual(paths(BASE));
  });
});

describe("injectDefect, JSON", () => {
  it("invalid-json : le fichier n'est plus du JSON", () => {
    const text = jsonText(injectDefect(BASE, "invalid-json"));
    expect(() => {
      JSON.parse(text);
    }).toThrow();
    expect(jsonText(BASE).startsWith(text)).toBe(true);
  });

  it("schema-violation : du JSON valide, mais la première page n'a pas de largeur", () => {
    const parsed: unknown = JSON.parse(
      jsonText(injectDefect(BASE, "schema-violation")),
    );
    const { largeur, ...first } = BASE.json.pages[0];
    expect(largeur).toBe(1240);
    expect(parsed).toEqual({
      ...BASE.json,
      pages: [first, ...BASE.json.pages.slice(1)],
    });
  });

  it("ne modifie pas le brouillon reçu", () => {
    const before = structuredClone(BASE);
    injectDefect(BASE, "decreasing-pages");
    injectDefect(BASE, "invalid-page-id");
    injectDefect(BASE, "schema-violation");
    expect(BASE).toEqual(before);
  });
});
