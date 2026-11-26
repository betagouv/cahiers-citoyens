import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ZipFile } from "yazl";

// ZIP de test construits en mémoire. yazl refuse les noms en `..`, absolus ou
// avec une barre oblique inverse : on les écrit sous un nom de même longueur,
// remplacé ensuite dans les octets du ZIP.

export interface TestEntry {
  name: string;
  bytes: Uint8Array | string;
  compress?: boolean;
  mode?: number;
  directory?: boolean;
}

export interface TestZipOptions {
  zip64?: boolean;
}

const CENTRAL_SIGNATURE = Buffer.from([0x50, 0x4b, 0x01, 0x02]);

function needsPlaceholder(name: string): boolean {
  return /\\|^\/|^[A-Za-z]:/.test(name) || name.split("/").includes("..");
}

function placeholder(name: string, index: number): string {
  return `${index}`.padStart(Buffer.byteLength(name), "#");
}

function replaceAll(buffer: Buffer, from: string, to: string): void {
  const source = Buffer.from(from);
  const target = Buffer.from(to);
  for (
    let at = buffer.indexOf(source);
    at !== -1;
    at = buffer.indexOf(source, at + 1)
  ) {
    target.copy(buffer, at);
  }
}

function addEntry(
  zip: ZipFile,
  entry: TestEntry,
  name: string,
  zip64: boolean,
) {
  if (entry.directory === true) {
    zip.addEmptyDirectory(name, { mode: entry.mode });
    return;
  }
  zip.addBuffer(Buffer.from(entry.bytes), name, {
    compress: entry.compress ?? false,
    mode: entry.mode,
    forceZip64Format: zip64,
  });
}

export async function zipBuffer(
  entries: readonly TestEntry[],
  { zip64 = false }: TestZipOptions = {},
): Promise<Buffer> {
  const zip = new ZipFile();
  const renamed: [string, string][] = [];
  entries.forEach((entry, i) => {
    const name = needsPlaceholder(entry.name)
      ? placeholder(entry.name, i)
      : entry.name;
    if (name !== entry.name) renamed.push([name, entry.name]);
    addEntry(zip, entry, name, zip64);
  });
  zip.end({ forceZip64Format: zip64, comment: "" });
  const chunks: Buffer[] = [];
  for await (const chunk of zip.outputStream) {
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  for (const [from, to] of renamed) replaceAll(buffer, from, to);
  return buffer;
}

// Position de l'en-tête du fichier `index` dans le répertoire central.
export function centralHeaderOffset(buffer: Buffer, index: number): number {
  let at = -1;
  for (let i = 0; i <= index; i++) {
    at = buffer.indexOf(CENTRAL_SIGNATURE, at + 1);
  }
  if (at === -1) {
    throw new Error(`en-tête central ${index} introuvable`);
  }
  return at;
}

export interface TempDir {
  path: string;
  write(name: string, bytes: Uint8Array): Promise<string>;
  remove(): Promise<void>;
}

export async function tempDir(prefix: string): Promise<TempDir> {
  const path = await mkdtemp(join(tmpdir(), prefix));
  return {
    path,
    async write(name, bytes) {
      const file = join(path, name);
      await writeFile(file, bytes);
      return file;
    },
    remove: () => rm(path, { recursive: true, force: true }),
  };
}
