import { describe, expect, it } from "vitest";
import {
  draftEntries,
  draftNotebook,
  type NotebookContent,
} from "./notebook-draft";
import { buildNotebookJson, serializeJson } from "./notebook-json";

const PNG_A = new Uint8Array([1, 2, 3]);
const PNG_B = new Uint8Array([4, 5]);

const CONTENT: NotebookContent = {
  id: "CC_1",
  pages: [
    { text: "Une page", png: PNG_A },
    { text: "", png: PNG_B },
  ],
};

describe("draftNotebook", () => {
  it("prépare notebook.json et une image par page dans le dossier du cahier", () => {
    expect(draftNotebook(CONTENT)).toEqual({
      dir: "notebooks/CC_1",
      json: buildNotebookJson("CC_1", ["Une page", ""]),
      manifest: null,
      images: [
        { path: "notebooks/CC_1/0001.png", bytes: PNG_A, compress: false },
        { path: "notebooks/CC_1/0002.png", bytes: PNG_B, compress: false },
      ],
      extras: [],
    });
  });
});

describe("draftEntries", () => {
  it("compresse notebook.json, stocke les PNG tels quels", () => {
    const entries = draftEntries(draftNotebook(CONTENT));
    expect(entries.map(({ path, compress }) => [path, compress])).toEqual([
      ["notebooks/CC_1/notebook.json", true],
      ["notebooks/CC_1/0001.png", false],
      ["notebooks/CC_1/0002.png", false],
    ]);
    expect(entries[0].bytes).toEqual(
      serializeJson(buildNotebookJson("CC_1", ["Une page", ""])),
    );
  });

  it("préfère le manifeste brut et ajoute les fichiers en plus", () => {
    const manifest = new Uint8Array([123]);
    const extra = { path: "notebooks/CC_1/x", bytes: PNG_A, compress: true };
    const entries = draftEntries({
      ...draftNotebook(CONTENT),
      manifest,
      extras: [extra],
    });
    expect(entries[0].bytes).toBe(manifest);
    expect(entries[entries.length - 1]).toBe(extra);
  });
});
