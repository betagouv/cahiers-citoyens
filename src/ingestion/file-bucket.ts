import { createWriteStream } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import type { ImageStorage } from "./image-storage";
import type { ObjectStore } from "./object-store";

async function listFiles(root: string): Promise<string[]> {
  try {
    const entries = await readdir(root, {
      recursive: true,
      withFileTypes: true,
    });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name).slice(root.length + 1))
      .map((path) => path.split(sep).join("/"))
      .sort();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

// Bucket simulé par un dossier, pour le développement et les essais locaux :
// la clé `incoming/x.zip` est le fichier `<root>/incoming/x.zip`.
export function createFileBucket(root: string): ObjectStore & ImageStorage {
  function file(key: string): string {
    return join(root, key);
  }
  return {
    async list(prefix) {
      return (await listFiles(root)).filter((key) => key.startsWith(prefix));
    },
    async copy(from, to) {
      await mkdir(dirname(file(to)), { recursive: true });
      await copyFile(file(from), file(to));
    },
    async remove(key) {
      await rm(file(key), { force: true });
    },
    async download(key, path) {
      await copyFile(file(key), path);
    },
    async modifiedAt(key) {
      return (await stat(file(key))).mtime;
    },
    async writeJson(key, json) {
      await mkdir(dirname(file(key)), { recursive: true });
      await writeFile(file(key), json);
    },
    async put({ key, body }) {
      await mkdir(dirname(file(key)), { recursive: true });
      await pipeline(body, createWriteStream(file(key)));
    },
  };
}

// Stockage de `scripts/ingest-local.ts` : `LOCAL_BUCKET_DIR`, `data/bucket` par défaut.
export function openFileStorage(env: Record<string, string | undefined>): {
  store: ObjectStore;
  images: ImageStorage;
} {
  const bucket = createFileBucket(env.LOCAL_BUCKET_DIR ?? "data/bucket");
  return { store: bucket, images: bucket };
}
