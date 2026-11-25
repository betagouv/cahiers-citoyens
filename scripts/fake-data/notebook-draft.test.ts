import { describe, expect, it } from "vitest";
import { draftEntries, draftNotebook } from "./notebook-draft";
import {
  buildNotebookJson,
  type NotebookContent,
  serializeJson,
} from "./notebook-json";
import { notebookMetadata } from "./notebook-metadata";
import { shortNotebook } from "./test-notebook";

const IMAGE_A = new Uint8Array([1, 2, 3]);
const IMAGE_B = new Uint8Array([4, 5]);

const CONTENT: NotebookContent = {
  id: "CC_1",
  metadata: notebookMetadata(shortNotebook().municipality, "76600"),
  pages: [
    { number: 1, lines: [], image: { bytes: IMAGE_A, extension: "png" } },
    { number: 5, lines: [], image: { bytes: IMAGE_B, extension: "png" } },
  ],
};

describe("draftNotebook", () => {
  it("prépare le JSON et une image par page nommée d'après son id_page", () => {
    expect(draftNotebook(CONTENT)).toEqual({
      id: "CC_1",
      json: buildNotebookJson(CONTENT),
      jsonBytes: null,
      images: [
        { path: "CC_1_1.png", bytes: IMAGE_A, compress: false },
        { path: "CC_1_5.png", bytes: IMAGE_B, compress: false },
      ],
      extras: [],
    });
  });
});

describe("draftEntries", () => {
  it("met tout à plat à la racine, compresse le JSON, stocke les images", () => {
    const entries = draftEntries(draftNotebook(CONTENT));
    expect(entries.map(({ path, compress }) => [path, compress])).toEqual([
      ["CC_1.json", true],
      ["CC_1_1.png", false],
      ["CC_1_5.png", false],
    ]);
    expect(entries[0].bytes).toEqual(serializeJson(buildNotebookJson(CONTENT)));
  });

  it("préfère le JSON brut et ajoute les fichiers en plus", () => {
    const jsonBytes = new Uint8Array([123]);
    const extra = { path: "x", bytes: IMAGE_A, compress: true };
    const entries = draftEntries({
      ...draftNotebook(CONTENT),
      jsonBytes,
      extras: [extra],
    });
    expect(entries[0].bytes).toBe(jsonBytes);
    expect(entries[entries.length - 1]).toBe(extra);
  });
});
