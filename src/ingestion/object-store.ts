import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import {
  type S3Settings,
  createS3Client,
  prefixedKey,
} from "../lib/s3-storage";

// Les ZIP du bucket : `incoming/` où Condorcet dépose, `deliveries/` où le job
// les garde, et les rapports de `reports/` que Condorcet lit. Clés relatives au préfixe du bucket, comme pour les images.
export interface ObjectStore {
  // Clés qui commencent par `prefix`, dans l'ordre du stockage.
  list(prefix: string): Promise<string[]>;
  // Écrase la destination si elle existe.
  copy(from: string, to: string): Promise<void>;
  // Supprimer une clé absente ne fait rien.
  remove(key: string): Promise<void>;
  // Écrit l'objet dans le fichier `path`, en flux.
  download(key: string, path: string): Promise<void>;
  // Date de dernière écriture de l'objet.
  modifiedAt(key: string): Promise<Date>;
  // Écrit un document JSON, en écrasant l'objet s'il existe.
  writeJson(key: string, json: string): Promise<void>;
}

export type S3Command =
  | ListObjectsV2Command
  | CopyObjectCommand
  | DeleteObjectCommand
  | GetObjectCommand
  | HeadObjectCommand
  | PutObjectCommand;

export interface S3Sender {
  send(command: S3Command): Promise<unknown>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

interface ListPage {
  keys: string[];
  next: string | undefined;
}

function parseListPage(output: unknown): ListPage {
  if (!isObject(output)) throw new Error("Réponse de liste S3 invalide");
  const contents = Array.isArray(output.Contents) ? output.Contents : [];
  const keys = contents.flatMap((item: unknown) =>
    isObject(item) && typeof item.Key === "string" ? [item.Key] : [],
  );
  const token = output.NextContinuationToken;
  const next =
    output.IsTruncated === true && typeof token === "string"
      ? token
      : undefined;
  return { keys, next };
}

function parseBody(output: unknown, key: string): Readable {
  if (isObject(output) && output.Body instanceof Readable) return output.Body;
  throw new Error(`Objet S3 sans contenu lisible : ${key}`);
}

function parseModified(output: unknown, key: string): Date {
  if (isObject(output) && output.LastModified instanceof Date) {
    return output.LastModified;
  }
  throw new Error(`Objet S3 sans date de modification : ${key}`);
}

// `CopySource` est encodé comme une URL, barres obliques comprises entre les segments.
function copySource(bucket: string, key: string): string {
  return [bucket, ...key.split("/")].map(encodeURIComponent).join("/");
}

// Clés complètes sous `prefix`, page après page.
async function listKeys(
  client: S3Sender,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const page = parseListPage(
      await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: token,
        }),
      ),
    );
    keys.push(...page.keys);
    token = page.next;
  } while (token !== undefined);
  return keys;
}

export function createS3ObjectStore(
  settings: S3Settings,
  client: S3Sender = createS3Client(settings),
): ObjectStore {
  const { bucket, prefix } = settings;
  function fullKey(key: string): string {
    return prefixedKey(prefix, key);
  }
  function relativeKey(key: string): string {
    return key.slice(fullKey("").length);
  }
  return {
    async list(listed) {
      const keys = await listKeys(client, bucket, fullKey(listed));
      return keys.map(relativeKey);
    },
    async copy(from, to) {
      await client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: copySource(bucket, fullKey(from)),
          Key: fullKey(to),
        }),
      );
    },
    async remove(key) {
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: fullKey(key) }),
      );
    },
    async download(key, path) {
      const output = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: fullKey(key) }),
      );
      await pipeline(parseBody(output, key), createWriteStream(path));
    },
    async modifiedAt(key) {
      const output = await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: fullKey(key) }),
      );
      return parseModified(output, key);
    },
    async writeJson(key, json) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: fullKey(key),
          Body: json,
          ContentType: "application/json",
        }),
      );
    },
  };
}
