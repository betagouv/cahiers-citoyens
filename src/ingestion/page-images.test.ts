import { describe, expect, it } from "vitest";
import { imageFileErrors, matchPageImages } from "./page-images";
import { EXAMPLE_ID } from "./test-notebook";
import { example, exampleFiles, fakeSha256, imageFile } from "./test-files";

const ID = EXAMPLE_ID;

describe("imageFileErrors", () => {
  it("ne dit rien d'images lisibles, une par page", () => {
    expect(imageFileErrors(exampleFiles())).toEqual([]);
  });

  it("signale deux images pour une page et une image illisible", () => {
    const files = exampleFiles([
      imageFile(1, "png"),
      imageFile(1, "jpg"),
      imageFile(3, "png", null),
      { ...imageFile(5), digest: null },
    ]);
    expect(imageFileErrors(files)).toEqual([
      {
        notebook: ID,
        file: `${ID}_1.jpg`,
        page: 1,
        code: "duplicate-image",
        message: `${ID}_1.jpg et ${ID}_1.png sont deux images de la page 1 : une seule est admise.`,
      },
      {
        notebook: ID,
        file: `${ID}_3.png`,
        page: 3,
        code: "invalid-image",
        message: `${ID}_3.png n'est ni un JPEG ni un PNG lisible.`,
      },
    ]);
  });
});

describe("matchPageImages", () => {
  it("associe à chaque page son image", () => {
    expect(
      matchPageImages(example(), [imageFile(3), imageFile(1, "jpeg")]),
    ).toEqual({
      errors: [],
      images: [
        {
          page: 1,
          entryName: `${ID}_1.jpeg`,
          type: "jpeg",
          sha256: fakeSha256(1),
          bytes: 1001,
          width: 2484,
          height: 3507,
        },
        expect.objectContaining({ page: 3, entryName: `${ID}_3.png` }),
      ],
    });
  });

  it("signale une image absente, une image en trop et une taille différente", () => {
    const resized = imageFile(3, "png", {
      type: "png",
      width: 1240,
      height: 3507,
    });
    expect(matchPageImages(example(), [resized, imageFile(2)]).errors).toEqual([
      {
        notebook: ID,
        file: `${ID}.json`,
        page: 1,
        code: "missing-image",
        message: `La page 1 n'a pas d'image : ${ID}_1.png, .jpg ou .jpeg attendu.`,
      },
      {
        notebook: ID,
        file: `${ID}_3.png`,
        page: 3,
        code: "image-size-mismatch",
        message: `${ID}_3.png mesure 1240 × 3507 pixels, le JSON annonce 2484 × 3507.`,
      },
      {
        notebook: ID,
        file: `${ID}_2.png`,
        page: 2,
        code: "unlisted-file",
        message: `Fichier en trop : ${ID}_2.png est l'image d'une page 2 que ${ID}.json n'annonce pas.`,
      },
    ]);
    const tall = imageFile(1, "png", { type: "png", width: 2484, height: 10 });
    expect(
      matchPageImages(example(), [tall, imageFile(3)]).errors,
    ).toMatchObject([{ code: "image-size-mismatch", page: 1 }]);
  });

  it("ne redit rien d'une page dont les images sont déjà signalées", () => {
    const result = matchPageImages(example(), [
      imageFile(1, "png"),
      imageFile(1, "jpg"),
      imageFile(3, "png", null),
    ]);
    expect(result).toEqual({ errors: [], images: [] });
    const unreadable = { ...imageFile(1), digest: null };
    expect(
      matchPageImages(example(), [unreadable, imageFile(3)]).errors,
    ).toEqual([]);
  });
});
