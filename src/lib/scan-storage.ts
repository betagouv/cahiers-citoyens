import { GetObjectCommand, NoSuchKey, S3Client } from "@aws-sdk/client-s3";

const S3_VARIABLES = [
  "S3_ENDPOINT",
  "S3_REGION",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
] as const;

export interface S3Settings {
  endpoint: string;
  region: string;
  bucket: string;
  prefix: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface ScanObject {
  body: ReadableStream;
  contentLength: number | undefined;
  contentRange: string | undefined;
  etag: string | undefined;
}

export class StorageNotConfiguredError extends Error {}

export function parseS3Settings(
  env: Record<string, string | undefined>,
): S3Settings {
  const missing = S3_VARIABLES.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new StorageNotConfiguredError(
      `variables manquantes : ${missing.join(", ")}`,
    );
  }
  return {
    endpoint: env.S3_ENDPOINT ?? "",
    region: env.S3_REGION ?? "",
    bucket: env.S3_BUCKET ?? "",
    prefix: env.S3_PREFIX ?? "",
    accessKeyId: env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? "",
  };
}

// Les clés en base (`notebooks/<id>/scan.pdf`) sont relatives au préfixe du bucket.
export function prefixedKey(prefix: string, key: string): string {
  const trimmedPrefix = prefix.replace(/^\/+|\/+$/g, "");
  const trimmedKey = key.replace(/^\/+/, "");
  return trimmedPrefix === "" ? trimmedKey : `${trimmedPrefix}/${trimmedKey}`;
}

// Seule une plage simple (`bytes=0-1023`, `bytes=1024-`, `bytes=-500`) est
// relayée au stockage ; toute autre forme est ignorée et le fichier part entier.
export function parseByteRange(header: string | null): string | undefined {
  if (header === null) return undefined;
  const value = header.trim();
  return /^bytes=(\d+-\d*|-\d+)$/.test(value) ? value : undefined;
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

// `undefined` si l'objet n'existe pas dans le bucket.
export async function openScan(
  scanKey: string,
  range: string | undefined,
  signal: AbortSignal,
): Promise<ScanObject | undefined> {
  const { settings, client } = getStorage();
  try {
    const object = await client.send(
      new GetObjectCommand({
        Bucket: settings.bucket,
        Key: prefixedKey(settings.prefix, scanKey),
        Range: range,
      }),
      { abortSignal: signal },
    );
    if (object.Body === undefined) return undefined;
    return {
      body: object.Body.transformToWebStream(),
      contentLength: object.ContentLength,
      contentRange: object.ContentRange,
      etag: object.ETag,
    };
  } catch (error) {
    if (error instanceof NoSuchKey) return undefined;
    throw error;
  }
}
