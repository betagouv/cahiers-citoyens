import { createHash } from "node:crypto";
import { buffer } from "node:stream/consumers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseSha256 } from "./fingerprint";
import type { ImageStorage, StoredImage } from "./image-storage";
import type { ImageUpload } from "./plan";
import { pngBytes } from "./test-images";
import { type TempDir, tempDir, zipBuffer } from "./test-zip";
import { uploadImages } from "./upload-images";

const IMAGE = pngBytes(4, 3);
const OTHER = pngBytes(5, 3);

let dir: TempDir;
let zipPath: string;

beforeAll(async () => {
  dir = await tempDir("upload-images-");
  zipPath = await dir.write(
    "delivery.zip",
    await zipBuffer([
      { name: "a.json", bytes: "{}" },
      { name: "a_1.png", bytes: IMAGE, compress: true },
      { name: "a_2.png", bytes: OTHER },
    ]),
  );
});

afterAll(async () => {
  await dir.remove();
});

function sha256(bytes: Uint8Array) {
  const value = parseSha256(createHash("sha256").update(bytes).digest("hex"));
  if (value === undefined) throw new Error("SHA-256 invalide");
  return value;
}

function upload(
  entryName: string,
  bytes: Uint8Array,
  key: string,
): ImageUpload {
  return {
    page: 1,
    key,
    entryName,
    contentType: "image/png",
    sha256: sha256(bytes),
    bytes: bytes.length,
  };
}

interface Stored extends Omit<StoredImage, "body"> {
  body: Buffer;
}

function memoryStorage(): ImageStorage & { stored: Stored[] } {
  const stored: Stored[] = [];
  return {
    stored,
    async put({ body, ...image }) {
      stored.push({ ...image, body: await buffer(body) });
    },
    async remove() {},
  };
}

describe("uploadImages", () => {
  it("copie en flux les seules images demandées, sous leur clé", async () => {
    const storage = memoryStorage();

    await uploadImages(
      zipPath,
      [upload("a_1.png", IMAGE, "notebooks/a/v1/1.png")],
      storage,
    );

    expect(storage.stored).toEqual([
      {
        key: "notebooks/a/v1/1.png",
        contentType: "image/png",
        contentLength: IMAGE.length,
        body: Buffer.from(IMAGE),
      },
    ]);
  });

  it("échoue si une image a changé depuis sa vérification", async () => {
    await expect(
      uploadImages(zipPath, [upload("a_2.png", IMAGE, "k")], memoryStorage()),
    ).rejects.toThrow("a_2.png a changé depuis sa vérification.");
  });

  it("échoue si une image a la même empreinte mais une autre taille", async () => {
    const changed = { ...upload("a_2.png", OTHER, "k"), bytes: 1 };
    await expect(
      uploadImages(zipPath, [changed], memoryStorage()),
    ).rejects.toThrow("a_2.png a changé depuis sa vérification.");
  });

  it("échoue si une image manque au ZIP", async () => {
    await expect(
      uploadImages(
        zipPath,
        [upload("b_1.png", IMAGE, "k"), upload("b_2.png", IMAGE, "k")],
        memoryStorage(),
      ),
    ).rejects.toThrow("Images absentes du ZIP : b_1.png, b_2.png.");
  });

  it("transmet l'échec du stockage", async () => {
    const storage: ImageStorage = {
      put: () => Promise.reject(new Error("stockage indisponible")),
      remove: () => Promise.resolve(),
    };
    await expect(
      uploadImages(zipPath, [upload("a_1.png", IMAGE, "k")], storage),
    ).rejects.toThrow("stockage indisponible");
  });
});
