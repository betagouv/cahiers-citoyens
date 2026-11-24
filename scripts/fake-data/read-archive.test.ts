import { describe, expect, it } from "vitest";
import { archiveBytes } from "./archive-bytes";
import { readArchive } from "./read-archive";

const AT = new Date("2026-11-24T09:30:00Z");
const CENTRAL_HEADER = Buffer.from([0x50, 0x4b, 0x01, 0x02]);

async function zipOf(compress: boolean): Promise<Buffer> {
  return archiveBytes(
    [
      {
        path: "a.txt",
        bytes: new TextEncoder().encode("contenu ".repeat(50)),
        compress,
      },
    ],
    AT,
  );
}

describe("readArchive", () => {
  it("lit chaque entrée avec son nom, sa méthode et ses octets", async () => {
    const [record] = await readArchive(await zipOf(true));
    expect(record.path).toBe("a.txt");
    expect(record.compressionMethod).toBe(8);
    expect(record.bytes.toString()).toBe("contenu ".repeat(50));
  });

  it("rejette ce qui n'est pas un ZIP", async () => {
    await expect(readArchive(Buffer.from("pas un zip"))).rejects.toThrow();
  });

  it("rejette un répertoire central corrompu", async () => {
    const zip = await zipOf(false);
    zip[zip.indexOf(CENTRAL_HEADER)] = 0;
    await expect(readArchive(zip)).rejects.toThrow(
      "invalid central directory file header signature",
    );
  });

  it("rejette une méthode de compression inconnue", async () => {
    const zip = await zipOf(false);
    zip.writeUInt16LE(99, zip.indexOf(CENTRAL_HEADER) + 10);
    await expect(readArchive(zip)).rejects.toThrow(
      "unsupported compression method: 99",
    );
  });

  it("rejette des données compressées illisibles", async () => {
    const zip = await zipOf(true);
    const dataStart = 30 + "a.txt".length;
    zip.fill(0xff, dataStart, dataStart + 8);
    await expect(readArchive(zip)).rejects.toThrow();
  });
});
