import type { Readable } from "node:stream";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type ArchiveEntry, forEachEntry } from "./archive";
import {
  centralHeaderOffset,
  type TempDir,
  type TestEntry,
  tempDir,
  zipBuffer,
} from "./test-zip";

let dir: TempDir;

beforeAll(async () => {
  dir = await tempDir("archive-");
});

afterAll(async () => {
  await dir.remove();
});

async function text(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    if (Buffer.isBuffer(chunk)) chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function entriesOf(path: string): Promise<ArchiveEntry[]> {
  const entries: ArchiveEntry[] = [];
  await forEachEntry(path, async (entry) => {
    entries.push(entry);
  });
  return entries;
}

// Lit chaque fichier au fil du parcours : contenu, ou message d'erreur.
async function contentsOf(path: string): Promise<string[]> {
  const contents: string[] = [];
  await forEachEntry(path, async (entry) => {
    try {
      contents.push(await text(await entry.open()));
    } catch (error) {
      contents.push(`erreur : ${String(error)}`);
    }
  });
  return contents;
}

const ENTRIES: TestEntry[] = [
  { name: "CC_1.json", bytes: '{"a": 1}', compress: true },
  { name: "CC_1_1.png", bytes: "STORED-IMAGE-BYTES" },
];

describe("forEachEntry", () => {
  it("échoue à l'ouverture d'un fichier dont l'en-tête local est abîmé", async () => {
    const zip = await zipBuffer(ENTRIES);
    zip.writeUInt32LE(0, zip.indexOf("CC_1_1.png") - 30);
    const path = await dir.write("local.zip", zip);
    expect(await contentsOf(path)).toEqual([
      '{"a": 1}',
      "erreur : Error: invalid local file header signature: 0x0",
    ]);
  });

  it("passe chaque fichier, dans l'ordre, avec son contenu", async () => {
    const path = await dir.write("ok.zip", await zipBuffer(ENTRIES));
    const entries = await entriesOf(path);
    expect(
      entries.map(
        ({ name, uncompressedSize, readable, externalFileAttributes }) => ({
          name,
          uncompressedSize,
          readable,
          mode: externalFileAttributes >>> 16,
        }),
      ),
    ).toEqual([
      {
        name: "CC_1.json",
        uncompressedSize: 8,
        readable: true,
        mode: 0o100664,
      },
      {
        name: "CC_1_1.png",
        uncompressedSize: 18,
        readable: true,
        mode: 0o100664,
      },
    ]);
    expect(await contentsOf(path)).toEqual(['{"a": 1}', "STORED-IMAGE-BYTES"]);
  });

  it("lit un ZIP64", async () => {
    const path = await dir.write(
      "zip64.zip",
      await zipBuffer(ENTRIES, { zip64: true }),
    );
    expect(await contentsOf(path)).toEqual(['{"a": 1}', "STORED-IMAGE-BYTES"]);
  });

  it("garde les noms bruts, même en `..`, et lit un nom sans drapeau UTF-8", async () => {
    const zip = await zipBuffer([
      { name: "../../escape.txt", bytes: "x" },
      { name: "ancien.txt", bytes: "y" },
    ]);
    const flags = centralHeaderOffset(zip, 1) + 8;
    zip.writeUInt16LE(zip.readUInt16LE(flags) & ~0x800, flags);
    const path = await dir.write("names.zip", zip);
    expect((await entriesOf(path)).map(({ name }) => name)).toEqual([
      "../../escape.txt",
      "ancien.txt",
    ]);
  });

  it("échoue à la lecture d'un fichier dont le CRC32 ne correspond pas", async () => {
    const zip = await zipBuffer(ENTRIES);
    const at = zip.indexOf("STORED-IMAGE-BYTES");
    zip[at] = "X".charCodeAt(0);
    const path = await dir.write("crc.zip", zip);
    const [json, image] = await contentsOf(path);
    expect(json).toBe('{"a": 1}');
    expect(image).toMatch(
      /^erreur : Error: CRC32 [0-9a-f]+ au lieu de [0-9a-f]+$/,
    );
  });

  it("échoue à la lecture d'un fichier compressé corrompu", async () => {
    const zip = await zipBuffer([
      { name: "a.json", bytes: "a".repeat(500), compress: true },
    ]);
    const header = centralHeaderOffset(zip, 0);
    zip.fill(0xff, 30 + "a.json".length, header);
    const path = await dir.write("deflate.zip", zip);
    const [content] = await contentsOf(path);
    expect(content).toMatch(/^erreur : /);
  });

  it("signale un fichier chiffré ou compressé autrement qu'en Deflate", async () => {
    const zip = await zipBuffer([
      { name: "chiffre.json", bytes: "{}", compress: true },
      { name: "bzip2.json", bytes: "{}", compress: true },
    ]);
    const encrypted = centralHeaderOffset(zip, 0) + 8;
    zip.writeUInt16LE(zip.readUInt16LE(encrypted) | 0x1, encrypted);
    zip.writeUInt16LE(12, centralHeaderOffset(zip, 1) + 10);
    const path = await dir.write("unsupported.zip", zip);
    expect((await entriesOf(path)).map(({ readable }) => readable)).toEqual([
      false,
      false,
    ]);
  });

  it("rejette un fichier qui n'est pas un ZIP, ou un ZIP tronqué", async () => {
    const notZip = await dir.write(
      "texte.zip",
      new TextEncoder().encode("bonjour"),
    );
    await expect(entriesOf(notZip)).rejects.toThrow(
      /end of central directory/i,
    );
    const zip = await zipBuffer(ENTRIES);
    const truncated = await dir.write(
      "tronque.zip",
      zip.subarray(0, zip.length - 30),
    );
    await expect(entriesOf(truncated)).rejects.toThrow();
    await expect(entriesOf(`${dir.path}/absent.zip`)).rejects.toThrow(/ENOENT/);
  });

  it("rejette un répertoire central incohérent", async () => {
    const zip = await zipBuffer(ENTRIES);
    // Taille compressée d'un fichier stocké différente de sa taille réelle.
    zip.writeUInt32LE(5, centralHeaderOffset(zip, 1) + 20);
    const path = await dir.write("tailles.zip", zip);
    await expect(entriesOf(path)).rejects.toThrow(/size mismatch/);
  });

  it("rejette si la visite échoue", async () => {
    const path = await dir.write("visite.zip", await zipBuffer(ENTRIES));
    await expect(
      forEachEntry(path, () => Promise.reject(new Error("visite"))),
    ).rejects.toThrow("visite");
  });
});

describe("centralHeaderOffset", () => {
  it("échoue au-delà du dernier fichier", async () => {
    const zip = await zipBuffer(ENTRIES);
    expect(() => centralHeaderOffset(zip, 2)).toThrow(
      "en-tête central 2 introuvable",
    );
  });
});
