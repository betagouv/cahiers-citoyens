import { GetObjectCommand, NoSuchKey, S3Client } from "@aws-sdk/client-s3";
import { openLocalObject } from "./local-bucket";

export interface S3Settings {
  endpoint: string;
  region: string;
  bucket: string;
  prefix: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface StoredObject {
  body: ReadableStream;
  contentLength: number | undefined;
  etag: string | undefined;
}

export class StorageNotConfiguredError extends Error {}

export function parseS3Settings(
  env: Record<string, string | undefined>,
): S3Settings {
  const missing: string[] = [];
  function required(name: string): string {
    const value = env[name];
    if (!value) missing.push(name);
    return value ?? "";
  }
  const settings = {
    endpoint: required("S3_ENDPOINT"),
    region: required("S3_REGION"),
    bucket: required("S3_BUCKET"),
    prefix: env.S3_PREFIX ?? "",
    accessKeyId: required("S3_ACCESS_KEY_ID"),
    secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
  };
  if (missing.length > 0) {
    throw new StorageNotConfiguredError(
      `variables manquantes : ${missing.join(", ")}`,
    );
  }
  return settings;
}

// Les clés en base (`notebooks/<id>/v<version>/<page>.jpg`) sont relatives au préfixe du bucket.
export function prefixedKey(prefix: string, key: string): string {
  const trimmedPrefix = prefix.replace(/^\/+|\/+$/g, "");
  const trimmedKey = key.replace(/^\/+/, "");
  return trimmedPrefix === "" ? trimmedKey : `${trimmedPrefix}/${trimmedKey}`;
}

export function createS3Client(settings: S3Settings): S3Client {
  return new S3Client({
    endpoint: settings.endpoint,
    region: settings.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: settings.accessKeyId,
      secretAccessKey: settings.secretAccessKey,
    },
    // Outscale OOS refuse les sommes de contrôle « trailing » que le SDK ajoute par défaut.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

let storage: { settings: S3Settings; client: S3Client } | undefined;

function getStorage() {
  if (storage === undefined) {
    const settings = parseS3Settings(process.env);
    storage = { settings, client: createS3Client(settings) };
  }
  return storage;
}

// `undefined` si l'objet n'existe pas dans le bucket. Avec `LOCAL_BUCKET_DIR`,
// en développement, l'objet est lu dans ce dossier, là où
// `scripts/ingest-local.ts` publie les images.
export async function openObject(
  key: string,
  signal: AbortSignal,
): Promise<StoredObject | undefined> {
  const localRoot = process.env.LOCAL_BUCKET_DIR;
  if (localRoot) return openLocalObject(localRoot, key);
  const { settings, client } = getStorage();
  try {
    const object = await client.send(
      new GetObjectCommand({
        Bucket: settings.bucket,
        Key: prefixedKey(settings.prefix, key),
      }),
      { abortSignal: signal },
    );
    if (object.Body === undefined) return undefined;
    return {
      body: object.Body.transformToWebStream(),
      contentLength: object.ContentLength,
      etag: object.ETag,
    };
  } catch (error) {
    if (error instanceof NoSuchKey) return undefined;
    throw error;
  }
}
