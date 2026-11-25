import { Writable } from "node:stream";
import type { ArchiveEntry } from "./notebook-draft";
import { writeArchive } from "./write-archive";

async function* fromArray(
  entries: readonly ArchiveEntry[],
): AsyncGenerator<ArchiveEntry> {
  yield* entries;
}

export async function archiveBytes(
  entries: readonly ArchiveEntry[] | AsyncIterable<ArchiveEntry>,
  modifiedAt: Date,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const sink = new Writable({
    write(chunk: Buffer, _encoding, done) {
      chunks.push(chunk);
      done();
    },
  });
  await writeArchive(
    Symbol.asyncIterator in entries ? entries : fromArray(entries),
    modifiedAt,
    sink,
  );
  return Buffer.concat(chunks);
}
