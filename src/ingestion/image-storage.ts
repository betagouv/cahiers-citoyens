import type { Readable } from "node:stream";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  type S3Settings,
  createS3Client,
  prefixedKey,
} from "../lib/scan-storage";
import type { ImageContentType } from "./notebook";

export interface StoredImage {
  key: string;
  body: Readable;
  contentType: ImageContentType;
  contentLength: number;
}

// Images servies par le site, sous des clés relatives au préfixe du bucket.
// Écrire une clé existante la remplace ; supprimer une clé absente ne fait rien.
export interface ImageStorage {
  put(image: StoredImage): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface CommandSender {
  send(command: PutObjectCommand | DeleteObjectCommand): Promise<unknown>;
}

// Une requête par objet : `DeleteObjects` exige une somme de contrôle que le
// stockage n'accepte pas (voir `createS3Client`). La longueur est fournie :
// le corps part en flux, sans être lu en mémoire.
export function createS3ImageStorage(
  settings: S3Settings,
  client: CommandSender = createS3Client(settings),
): ImageStorage {
  return {
    async put({ key, body, contentType, contentLength }) {
      await client.send(
        new PutObjectCommand({
          Bucket: settings.bucket,
          Key: prefixedKey(settings.prefix, key),
          Body: body,
          ContentType: contentType,
          ContentLength: contentLength,
        }),
      );
    },
    async remove(key) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: settings.bucket,
          Key: prefixedKey(settings.prefix, key),
        }),
      );
    },
  };
}
