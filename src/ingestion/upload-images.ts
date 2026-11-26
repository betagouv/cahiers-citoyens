import { createHash } from "node:crypto";
import { Transform, pipeline } from "node:stream";
import { type ArchiveEntry, forEachEntry } from "./archive";
import type { ImageStorage } from "./image-storage";
import type { ImageUpload } from "./plan";

async function uploadEntry(
  entry: ArchiveEntry,
  upload: ImageUpload,
  storage: ImageStorage,
): Promise<void> {
  const hash = createHash("sha256");
  let bytes = 0;
  const counted = new Transform({
    transform(chunk: Buffer, _encoding, done) {
      hash.update(chunk);
      bytes += chunk.length;
      done(null, chunk);
    },
  });
  // Une erreur de lecture (CRC, données tronquées) détruit `counted` : l'envoi
  // échoue au lieu d'attendre la fin du flux.
  pipeline(await entry.open(), counted, () => undefined);
  await storage.put({
    key: upload.key,
    body: counted,
    contentType: upload.contentType,
    contentLength: upload.bytes,
  });
  if (hash.digest("hex") !== upload.sha256 || bytes !== upload.bytes) {
    throw new Error(`${entry.name} a changé depuis sa vérification.`);
  }
}

// Copie, un fichier à la fois et en flux, les images du ZIP vers leurs clés.
// Chaque image est recomptée au passage : le stockage ne reçoit que les octets
// vérifiés. Une copie interrompue se relance telle quelle : les clés sont les
// mêmes, et aucune n'est visible avant le commit qui les référence.
export async function uploadImages(
  zipPath: string,
  uploads: readonly ImageUpload[],
  storage: ImageStorage,
): Promise<void> {
  const pending = new Map(uploads.map((upload) => [upload.entryName, upload]));
  await forEachEntry(zipPath, async (entry) => {
    const upload = pending.get(entry.name);
    if (upload === undefined) return;
    await uploadEntry(entry, upload, storage);
    pending.delete(entry.name);
  });
  if (pending.size > 0) {
    throw new Error(
      `Images absentes du ZIP : ${[...pending.keys()].join(", ")}.`,
    );
  }
}
