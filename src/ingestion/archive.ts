import { type Readable, Transform, pipeline } from "node:stream";
import { crc32 } from "node:zlib";
import { type Entry, open as openZip, type ZipFile } from "yauzl";

export interface ArchiveEntry {
  name: string;
  externalFileAttributes: number;
  uncompressedSize: number;
  // Ni chiffré, ni compressé autrement qu'en Deflate.
  readable: boolean;
  // Flux du contenu décompressé. Il échoue en fin de lecture si le CRC32 ne
  // correspond pas, ou dès qu'une donnée est tronquée ou mal compressée.
  open(): Promise<Readable>;
}

const STORED = 0;
const DEFLATED = 8;
const UTF8_FLAG = 0x800;

// Sans le drapeau UTF-8, le nom est en CP437 : ses octets ASCII se lisent de
// même, les autres ne correspondent à aucun nom admis par le protocole.
function entryName(entry: Entry): string {
  const utf8 = (entry.generalPurposeBitFlag & UTF8_FLAG) !== 0;
  return entry.fileNameRaw.toString(utf8 ? "utf8" : "latin1");
}

function crcCheck(expected: number): Transform {
  let actual = 0;
  return new Transform({
    transform(chunk: Buffer, _encoding, done) {
      actual = crc32(chunk, actual);
      done(null, chunk);
    },
    flush(done) {
      done(
        actual === expected
          ? null
          : new Error(
              `CRC32 ${actual.toString(16)} au lieu de ${expected.toString(16)}`,
            ),
      );
    },
  });
}

function openEntry(zip: ZipFile, entry: Entry): Promise<Readable> {
  return new Promise((resolve, reject) => {
    zip.openReadStream(entry, (error, stream) => {
      if (error !== null) {
        reject(error);
        return;
      }
      const checked = crcCheck(entry.crc32);
      pipeline(stream, checked, () => undefined);
      resolve(checked);
    });
  });
}

function toArchiveEntry(zip: ZipFile, entry: Entry): ArchiveEntry {
  return {
    name: entryName(entry),
    externalFileAttributes: entry.externalFileAttributes,
    uncompressedSize: entry.uncompressedSize,
    readable:
      !entry.isEncrypted() &&
      (entry.compressionMethod === STORED ||
        entry.compressionMethod === DEFLATED),
    open: () => openEntry(zip, entry),
  };
}

// Lit le répertoire central d'un ZIP (ZIP64 compris) et passe chaque fichier,
// un à la fois, à `visit`, qui lit son contenu s'il en a besoin. Rejette si
// le ZIP est illisible ; une erreur d'un fichier reste à `visit`.
// decodeStrings: false, sinon yauzl refuse les noms en `..` avant qu'on les
// signale.
export function forEachEntry(
  path: string,
  visit: (entry: ArchiveEntry) => Promise<void>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    openZip(
      path,
      { lazyEntries: true, decodeStrings: false, validateEntrySizes: true },
      (error, zip) => {
        if (error !== null) {
          reject(error);
          return;
        }
        zip.on("error", reject);
        zip.on("end", () => resolve());
        zip.on("entry", (entry: Entry) => {
          visit(toArchiveEntry(zip, entry)).then(
            () => zip.readEntry(),
            (failure: unknown) => {
              zip.close();
              reject(failure);
            },
          );
        });
        zip.readEntry();
      },
    );
  });
}
