import { describe, expect, it } from "vitest";
import { injectDefect } from "./inject-defect";
import { draftEntries, draftNotebook } from "./notebook-draft";

const FIRST = new Uint8Array([10, 11, 12, 13]);
const LAST = new Uint8Array([20, 21]);
const BASE = draftNotebook({
  id: "CC_1",
  pages: [
    { text: "Première", png: FIRST },
    { text: "", png: new Uint8Array([15]) },
    { text: "Dernière", png: LAST },
  ],
});
const DIR = "notebooks/CC_1";

function paths(draft: typeof BASE): string[] {
  return draftEntries(draft).map(({ path }) => path);
}

function manifestText(draft: typeof BASE): string {
  return new TextDecoder().decode(draftEntries(draft)[0].bytes);
}

describe("injectDefect", () => {
  it("missing-image : la dernière image annoncée manque", () => {
    const draft = injectDefect(BASE, "missing-image");
    expect(paths(draft)).not.toContain(`${DIR}/0003.png`);
    expect(draft.json).toEqual(BASE.json);
  });

  it("unlisted-file : un fichier non annoncé s'ajoute au dossier", () => {
    const draft = injectDefect(BASE, "unlisted-file");
    expect(paths(draft)).toEqual([...paths(BASE), `${DIR}/notes.txt`]);
    expect(draft.extras[0].compress).toBe(true);
  });

  it("page-gap : la dernière page saute un numéro", () => {
    const draft = injectDefect(BASE, "page-gap");
    expect(draft.json.pages.map(({ page }) => page)).toEqual([1, 2, 4]);
    expect(paths(draft)).toEqual(paths(BASE));
  });

  it("duplicate-page : le dernier numéro revient, avec sa propre image", () => {
    const draft = injectDefect(BASE, "duplicate-page");
    expect(draft.json.pages.map(({ page, image }) => [page, image])).toEqual([
      [1, "0001.png"],
      [2, "0002.png"],
      [3, "0003.png"],
      [3, "0004.png"],
    ]);
    expect(draft.images[3]).toEqual({
      path: `${DIR}/0004.png`,
      bytes: LAST,
      compress: false,
    });
  });
});

describe("injectDefect, contenu des fichiers", () => {
  it("invalid-png : la première image est tronquée", () => {
    const draft = injectDefect(BASE, "invalid-png");
    expect(Array.from(draft.images[0].bytes)).toEqual([10, 11]);
    expect(draft.images.slice(1)).toEqual(BASE.images.slice(1));
  });

  it("invalid-json : notebook.json n'est plus du JSON", () => {
    const text = manifestText(injectDefect(BASE, "invalid-json"));
    expect(() => {
      JSON.parse(text);
    }).toThrow();
    expect(manifestText(BASE).startsWith(text)).toBe(true);
  });

  it("schema-violation : du JSON valide, mais la première page n'a pas de texte", () => {
    const parsed: unknown = JSON.parse(
      manifestText(injectDefect(BASE, "schema-violation")),
    );
    expect(parsed).toEqual({
      ...BASE.json,
      pages: [{ page: 1, image: "0001.png" }, ...BASE.json.pages.slice(1)],
    });
  });
});

describe("injectDefect, arborescence", () => {
  it("path-traversal : une entrée remonte hors du dépôt", () => {
    expect(paths(injectDefect(BASE, "path-traversal"))).toContain(
      `${DIR}/../../../escape.txt`,
    );
  });

  it("nested-folder : un sous-dossier apparaît dans le cahier", () => {
    const [extra] = injectDefect(BASE, "nested-folder").extras;
    expect(extra).toEqual({
      path: `${DIR}/scans/0001.png`,
      bytes: FIRST,
      compress: false,
    });
  });

  it("ne modifie pas le brouillon reçu", () => {
    const before = structuredClone(BASE);
    injectDefect(BASE, "page-gap");
    injectDefect(BASE, "duplicate-page");
    expect(BASE).toEqual(before);
  });
});
