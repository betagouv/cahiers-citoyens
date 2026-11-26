import { describe, expect, it } from "vitest";
import { notebookFingerprint } from "./fingerprint";
import { EXAMPLE_ID, exampleNotebook } from "./test-notebook";
import { example, exampleFiles, fakeSha256, imageFile } from "./test-files";
import { verifyNotebook } from "./verify-notebook";

const ID = EXAMPLE_ID;

function codes(files: ReturnType<typeof exampleFiles>) {
  const result = verifyNotebook(files);
  return result.ok
    ? []
    : result.errors.map(({ code, file, page }) => ({ code, file, page }));
}

describe("verifyNotebook", () => {
  it("vérifie un cahier conforme et calcule son empreinte", () => {
    const notebook = example();
    const result = verifyNotebook(exampleFiles());
    expect(result).toEqual({
      ok: true,
      notebook: {
        notebook,
        fingerprint: notebookFingerprint({
          metadata: notebook.metadata,
          pages: notebook.pages.map((page) => ({
            ...page,
            imageSha256: fakeSha256(page.number),
          })),
        }),
        images: [
          expect.objectContaining({ page: 1, sha256: fakeSha256(1) }),
          expect.objectContaining({ page: 3, sha256: fakeSha256(3) }),
        ],
      },
    });
  });

  it("signale les images d'un cahier sans JSON", () => {
    const files = {
      ...exampleFiles([imageFile(1), imageFile(1, "jpg")]),
      json: null,
    };
    const result = verifyNotebook(files);
    expect(result.ok).toBe(false);
    expect(codes(files)).toEqual([
      { code: "unlisted-file", file: `${ID}_1.png`, page: 1 },
      { code: "unlisted-file", file: `${ID}_1.jpg`, page: 1 },
      { code: "duplicate-image", file: `${ID}_1.jpg`, page: 1 },
    ]);
    expect(!result.ok && result.errors[0].message).toBe(
      `Fichier en trop : aucun ${ID}.json ne décrit le cahier de ${ID}_1.png.`,
    );
  });

  it("n'ajoute rien à un JSON illisible, déjà signalé, sauf les images invalides", () => {
    expect(verifyNotebook(exampleFiles(undefined, null))).toEqual({
      ok: false,
      errors: [],
    });
    const invalid = exampleFiles(
      [imageFile(1, "png", null), imageFile(3)],
      null,
    );
    expect(codes(invalid)).toEqual([
      { code: "invalid-image", file: `${ID}_1.png`, page: 1 },
    ]);
  });

  it("ne cherche pas les images des pages d'un JSON refusé", () => {
    const duplicated = JSON.stringify({
      ...exampleNotebook(),
      id_cahier: "autre",
    });
    expect(
      codes(
        exampleFiles([imageFile(1), imageFile(2, "png", null)], duplicated),
      ),
    ).toEqual([
      { code: "notebook-id-mismatch", file: `${ID}.json`, page: undefined },
      { code: "invalid-image", file: `${ID}_2.png`, page: 2 },
    ]);
  });

  it("liste ensemble erreurs d'images et de polygones", () => {
    const raw = exampleNotebook();
    raw.pages[1].largeur = 100;
    raw.pages[0].lignes[0].polygone.coordinates[0][1] = [9999, 1];
    expect(
      codes(exampleFiles([imageFile(3), imageFile(4)], JSON.stringify(raw))),
    ).toEqual([
      { code: "missing-image", file: `${ID}.json`, page: 1 },
      { code: "image-size-mismatch", file: `${ID}_3.png`, page: 3 },
      { code: "unlisted-file", file: `${ID}_4.png`, page: 4 },
      { code: "polygon-out-of-page", file: `${ID}.json`, page: 1 },
    ]);
  });

  it("refuse sans erreur de plus une page dont l'image est illisible", () => {
    const unreadable = { ...imageFile(3), digest: null };
    expect(verifyNotebook(exampleFiles([imageFile(1), unreadable]))).toEqual({
      ok: false,
      errors: [],
    });
  });
});
