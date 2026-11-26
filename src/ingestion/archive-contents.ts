import { type ArchiveEntry, forEachEntry } from "./archive";
import { type EntryKind, entryKind } from "./entry-kind";
import { checkEntryHeader, printableName } from "./entry-name";
import { errorMessage } from "./error-message";
import type { IngestError } from "./errors";
import { digestImage, type ImageDigest } from "./image-digest";
import { JSON_SIZE_LIMIT, readJsonText } from "./json-text";
import type { NotebookId } from "./notebook-id";

// `text` et `digest` valent `null` quand le fichier n'a pas pu être lu :
// l'erreur est déjà signalée, il compte quand même comme présent.
export interface JsonFile {
  entryName: string;
  text: string | null;
}

export interface ImageFile {
  entryName: string;
  page: number;
  digest: ImageDigest | null;
}

export interface NotebookFiles {
  id: NotebookId;
  json: JsonFile | null;
  images: ImageFile[];
}

export interface ArchiveContents {
  errors: IngestError[];
  // Dans l'ordre où chaque cahier apparaît dans le ZIP.
  notebooks: NotebookFiles[];
}

type NotebookEntryKind = Exclude<EntryKind, { kind: "rejected" }>;

const MEBIBYTE = 1024 * 1024;

function entryError(
  entry: ArchiveEntry,
  kind: NotebookEntryKind,
  code: IngestError["code"],
  message: string,
): IngestError {
  return { notebook: kind.id, file: entry.name, code, message };
}

async function readJson(
  entry: ArchiveEntry,
  kind: NotebookEntryKind,
  errors: IngestError[],
): Promise<string | null> {
  const result = await readJsonText(await entry.open(), entry.uncompressedSize);
  if (result.ok) {
    return result.text;
  }
  errors.push(
    result.reason === "too-large"
      ? entryError(
          entry,
          kind,
          "json-too-large",
          `${entry.name} dépasse ${JSON_SIZE_LIMIT / MEBIBYTE} Mo.`,
        )
      : entryError(
          entry,
          kind,
          "invalid-json",
          `${entry.name} n'est pas encodé en UTF-8.`,
        ),
  );
  return null;
}

// Lit un fichier de cahier avec `read`. `null` si la lecture échoue.
async function readGuarded<T>(
  entry: ArchiveEntry,
  kind: NotebookEntryKind,
  errors: IngestError[],
  read: () => Promise<T | null>,
): Promise<T | null> {
  if (!entry.readable) {
    errors.push(
      entryError(
        entry,
        kind,
        "unsupported-entry",
        `${entry.name} est chiffré ou compressé autrement qu'en Deflate.`,
      ),
    );
    return null;
  }
  try {
    return await read();
  } catch (error) {
    errors.push(
      entryError(
        entry,
        kind,
        "corrupt-entry",
        `${entry.name} ne s'extrait pas sans erreur (${errorMessage(error)}).`,
      ),
    );
    return null;
  }
}

function filesOf(
  notebooks: Map<NotebookId, NotebookFiles>,
  id: NotebookId,
): NotebookFiles {
  const existing = notebooks.get(id);
  if (existing !== undefined) {
    return existing;
  }
  const created: NotebookFiles = { id, json: null, images: [] };
  notebooks.set(id, created);
  return created;
}

function headerError(
  entry: ArchiveEntry,
  seen: Set<string>,
): IngestError | null {
  if (seen.has(entry.name)) {
    const file = printableName(entry.name);
    return {
      file,
      code: "duplicate-entry",
      message: `${file} apparaît plusieurs fois dans le ZIP.`,
    };
  }
  seen.add(entry.name);
  return checkEntryHeader(entry);
}

// Parcourt le ZIP une fois : contrôle chaque nom, lit chaque JSON, hache
// chaque image, et range les fichiers par cahier.
export async function readArchiveContents(
  path: string,
  deliveryName: string,
): Promise<ArchiveContents> {
  const errors: IngestError[] = [];
  const notebooks = new Map<NotebookId, NotebookFiles>();
  const seen = new Set<string>();

  async function visit(entry: ArchiveEntry): Promise<void> {
    const header = headerError(entry, seen);
    if (header !== null) {
      errors.push(header);
      return;
    }
    const kind = entryKind(entry.name);
    if (kind.kind === "rejected") {
      errors.push(kind.error);
      return;
    }
    if (kind.kind === "json") {
      const text = await readGuarded(entry, kind, errors, () =>
        readJson(entry, kind, errors),
      );
      filesOf(notebooks, kind.id).json = { entryName: entry.name, text };
      return;
    }
    const digest = await readGuarded(entry, kind, errors, async () =>
      digestImage(await entry.open()),
    );
    filesOf(notebooks, kind.id).images.push({
      entryName: entry.name,
      page: kind.page,
      digest,
    });
  }

  try {
    await forEachEntry(path, visit);
  } catch (error) {
    errors.push({
      file: deliveryName,
      code: "unreadable-archive",
      message: `${deliveryName} n'est pas un ZIP lisible (${errorMessage(error)}).`,
    });
  }
  return { errors, notebooks: [...notebooks.values()] };
}
