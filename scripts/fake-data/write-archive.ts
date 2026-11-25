import type { Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { ZipFile } from "yazl";
import type { ArchiveEntry } from "./notebook-draft";
import { createByteReplacer } from "./replace-bytes";

const COMPRESSION_LEVEL = 9;

// yazl écrit l'heure DOS en heure locale : on lui passe une date locale qui porte
// l'heure UTC voulue, pour des octets identiques quel que soit le fuseau.
export function utcAsLocal(date: Date): Date {
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  );
}

function hasParentSegment(path: string): boolean {
  return path.split("/").includes("..");
}

// yazl refuse les noms contenant `..` : on les écrit sous un remplaçant de même
// longueur, corrigé ensuite dans l'en-tête local et le répertoire central.
function placeholderFor(path: string): string {
  return path
    .split("/")
    .map((segment) => (segment === ".." ? "__" : segment))
    .join("/");
}

export async function writeArchive(
  entries: AsyncIterable<ArchiveEntry>,
  modifiedAt: Date,
  output: Writable,
): Promise<void> {
  const zip = new ZipFile();
  const replacer = createByteReplacer();
  const mtime = utcAsLocal(modifiedAt);
  const encoder = new TextEncoder();

  async function addEntries(): Promise<void> {
    for await (const entry of entries) {
      let name = entry.path;
      if (hasParentSegment(name)) {
        name = placeholderFor(name);
        replacer.add(encoder.encode(name), encoder.encode(entry.path));
      }
      zip.addBuffer(
        Buffer.from(
          entry.bytes.buffer,
          entry.bytes.byteOffset,
          entry.bytes.byteLength,
        ),
        name,
        {
          mtime,
          compressionLevel: entry.compress ? COMPRESSION_LEVEL : 0,
          forceDosTimestamp: true,
        },
      );
    }
    zip.end();
  }

  await Promise.all([
    pipeline(zip.outputStream, replacer.stream, output),
    addEntries(),
  ]);
}
