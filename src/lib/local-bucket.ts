import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { StoredObject } from "./s3-storage";

// Lecture d'un objet dans le dossier qui tient lieu de bucket en local
// (`LOCAL_BUCKET_DIR`, celui de `scripts/ingest-local.ts`). Réservé au
// développement : l'objet est lu en entier. `undefined` si le fichier manque.
export async function openLocalObject(
  root: string,
  key: string,
): Promise<StoredObject | undefined> {
  let bytes;
  try {
    bytes = await readFile(join(root, key));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
  return {
    body: new Blob([bytes]).stream(),
    contentLength: bytes.byteLength,
    etag: undefined,
  };
}
