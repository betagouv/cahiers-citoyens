import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readArchiveContents } from "./archive-contents";
import { jpegBytes, pngBytes } from "./test-images";
import {
  centralHeaderOffset,
  type TempDir,
  type TestEntry,
  tempDir,
  zipBuffer,
} from "./test-zip";

const NAME = "delivery-2026-11-24-0930.zip";
const JPEG = jpegBytes(10, 20);

let dir: TempDir;
let count = 0;

beforeAll(async () => {
  dir = await tempDir("archive-contents-");
});

afterAll(async () => {
  await dir.remove();
});

async function zipFile(zip: Buffer): Promise<string> {
  count += 1;
  return dir.write(`${count}.zip`, zip);
}

async function read(entries: TestEntry[]) {
  return readArchiveContents(await zipFile(await zipBuffer(entries)), NAME);
}

describe("readArchiveContents, regroupement", () => {
  it("range JSON et images par cahier, dans l'ordre du ZIP", async () => {
    const contents = await read([
      { name: "CC_2_1.png", bytes: JPEG },
      { name: "CC_1.json", bytes: "{}", compress: true },
      { name: "CC_1_1.PNG", bytes: pngBytes(3, 4) },
      { name: "CC_2.json", bytes: "[]", compress: true },
    ]);
    expect(contents.errors).toEqual([]);
    expect(
      contents.notebooks.map(({ id, json, images }) => ({
        id,
        json,
        images: images.map(({ entryName, page, digest }) => ({
          entryName,
          page,
          header: digest?.header,
          bytes: digest?.bytes,
        })),
      })),
    ).toEqual([
      {
        id: "CC_2",
        json: { entryName: "CC_2.json", text: "[]" },
        images: [
          {
            entryName: "CC_2_1.png",
            page: 1,
            header: { type: "jpeg", width: 10, height: 20 },
            bytes: JPEG.length,
          },
        ],
      },
      {
        id: "CC_1",
        json: { entryName: "CC_1.json", text: "{}" },
        images: [
          {
            entryName: "CC_1_1.PNG",
            page: 1,
            header: { type: "png", width: 3, height: 4 },
            bytes: 29,
          },
        ],
      },
    ]);
  });
});

describe("readArchiveContents, fichiers refusés", () => {
  it("refuse les noms interdits, les doublons et les fichiers inconnus", async () => {
    const contents = await read([
      { name: "../../escape.txt", bytes: "x" },
      { name: "scans/", bytes: "", directory: true },
      { name: "scans/CC_1_1.png", bytes: JPEG },
      { name: "CC_1_1.png", bytes: JPEG, mode: 0o120777 },
      { name: "notes.txt", bytes: "x" },
      { name: "notes.txt", bytes: "y" },
      { name: "é.json", bytes: "{}" },
    ]);
    expect(contents.notebooks).toEqual([]);
    expect(contents.errors.map(({ code, file }) => ({ code, file }))).toEqual([
      { code: "invalid-entry-name", file: "../../escape.txt" },
      { code: "nested-entry", file: "scans/" },
      { code: "nested-entry", file: "scans/CC_1_1.png" },
      { code: "symlink-entry", file: "CC_1_1.png" },
      { code: "unlisted-file", file: "notes.txt" },
      { code: "duplicate-entry", file: "notes.txt" },
      { code: "invalid-notebook-id", file: "é.json" },
    ]);
    expect(contents.errors[5].message).toBe(
      "notes.txt apparaît plusieurs fois dans le ZIP.",
    );
  });
});

describe("readArchiveContents, fichiers illisibles", () => {
  it("signale un fichier chiffré, sans le lire, mais le garde présent", async () => {
    const zip = await zipBuffer([
      { name: "CC_1_1.png", bytes: JPEG, compress: true },
    ]);
    const flags = centralHeaderOffset(zip, 0) + 8;
    zip.writeUInt16LE(zip.readUInt16LE(flags) | 0x1, flags);
    const contents = await readArchiveContents(await zipFile(zip), NAME);
    expect(contents.errors).toEqual([
      {
        notebook: "CC_1",
        file: "CC_1_1.png",
        code: "unsupported-entry",
        message: "CC_1_1.png est chiffré ou compressé autrement qu'en Deflate.",
      },
    ]);
    expect(contents.notebooks[0].images).toEqual([
      { entryName: "CC_1_1.png", page: 1, digest: null },
    ]);
  });

  it("attribue une erreur de CRC à son fichier", async () => {
    const zip = await zipBuffer([
      { name: "CC_1.json", bytes: "{}", compress: true },
      { name: "CC_1_1.png", bytes: JPEG },
    ]);
    zip[zip.indexOf(Buffer.from(JPEG)) + JPEG.length - 1] ^= 0xff;
    const contents = await readArchiveContents(await zipFile(zip), NAME);
    expect(contents.errors).toHaveLength(1);
    expect(contents.errors[0]).toMatchObject({
      notebook: "CC_1",
      file: "CC_1_1.png",
      code: "corrupt-entry",
    });
    expect(contents.errors[0].message).toMatch(
      /^CC_1_1\.png ne s'extrait pas sans erreur \(CRC32 [0-9a-f]+ au lieu de [0-9a-f]+\)\.$/,
    );
    expect(contents.notebooks[0].images[0].digest).toBeNull();
  });

  it("signale un JSON corrompu, trop gros ou hors UTF-8", async () => {
    const zip = await zipBuffer([
      { name: "CC_1.json", bytes: "{}".repeat(100), compress: true },
      { name: "CC_2.json", bytes: "{}", compress: true },
      { name: "CC_3.json", bytes: Buffer.from([0x7b, 0xe9, 0x7d]) },
    ]);
    const first = centralHeaderOffset(zip, 0);
    zip.writeUInt32LE(zip.readUInt32LE(first + 16) ^ 1, first + 16);
    zip.writeUInt32LE(30 * 1024 * 1024, centralHeaderOffset(zip, 1) + 24);
    const contents = await readArchiveContents(await zipFile(zip), NAME);
    expect(
      contents.errors.map(({ notebook, code }) => ({ notebook, code })),
    ).toEqual([
      { notebook: "CC_1", code: "corrupt-entry" },
      { notebook: "CC_2", code: "json-too-large" },
      { notebook: "CC_3", code: "invalid-json" },
    ]);
    expect(contents.errors.slice(1).map(({ message }) => message)).toEqual([
      "CC_2.json dépasse 20 Mo.",
      "CC_3.json n'est pas encodé en UTF-8.",
    ]);
    expect(contents.notebooks.map(({ json }) => json)).toEqual([
      { entryName: "CC_1.json", text: null },
      { entryName: "CC_2.json", text: null },
      { entryName: "CC_3.json", text: null },
    ]);
  });

  it("signale un ZIP illisible", async () => {
    const path = await dir.write(
      "texte.zip",
      new TextEncoder().encode("bonjour"),
    );
    const contents = await readArchiveContents(path, NAME);
    expect(contents.notebooks).toEqual([]);
    expect(contents.errors).toEqual([
      {
        file: NAME,
        code: "unreadable-archive",
        message: `${NAME} n'est pas un ZIP lisible (End of central directory record signature not found. Either not a zip file, or file is truncated.).`,
      },
    ]);
  });
});
