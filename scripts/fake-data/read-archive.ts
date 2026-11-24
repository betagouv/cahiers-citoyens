import { fromBuffer, type Entry, type ZipFile } from "yauzl";

export interface ArchiveRecord {
  path: string;
  compressionMethod: number;
  dosDate: number;
  dosTime: number;
  bytes: Buffer;
}

function readEntry(zip: ZipFile, entry: Entry): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zip.openReadStream(entry, (error, stream) => {
      if (error !== null) {
        reject(error);
        return;
      }
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  });
}

// decodeStrings: false, sinon yauzl rejette les noms en `..` que l'on veut justement
// pouvoir inspecter.
export function readArchive(bytes: Uint8Array): Promise<ArchiveRecord[]> {
  return new Promise((resolve, reject) => {
    fromBuffer(
      Buffer.from(bytes),
      { lazyEntries: true, decodeStrings: false },
      (error, zip) => {
        if (error !== null) {
          reject(error);
          return;
        }
        const records: ArchiveRecord[] = [];
        zip.on("error", reject);
        zip.on("end", () => resolve(records));
        zip.on("entry", (entry: Entry) => {
          readEntry(zip, entry).then((data) => {
            records.push({
              // Avec decodeStrings: false, fileName est un Buffer malgré son type.
              path: Buffer.from(entry.fileName).toString("utf8"),
              compressionMethod: entry.compressionMethod,
              dosDate: entry.lastModFileDate,
              dosTime: entry.lastModFileTime,
              bytes: data,
            });
            zip.readEntry();
          }, reject);
        });
        zip.readEntry();
      },
    );
  });
}
