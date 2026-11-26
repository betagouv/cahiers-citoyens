import type { Readable } from "node:stream";

// Un cahier de plusieurs centaines de pages tient en quelques Mo de JSON.
export const JSON_SIZE_LIMIT = 20 * 1024 * 1024;

export type JsonTextResult =
  { ok: true; text: string } | { ok: false; reason: "too-large" | "not-utf8" };

// Lit un JSON en entier, sans dépasser `limit` octets : la taille annoncée
// par le ZIP peut mentir, on compte aussi ce qui arrive.
export async function readJsonText(
  stream: Readable,
  declaredSize: number,
  limit = JSON_SIZE_LIMIT,
): Promise<JsonTextResult> {
  if (declaredSize > limit) {
    stream.destroy();
    return { ok: false, reason: "too-large" };
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream) {
    if (!Buffer.isBuffer(chunk)) {
      throw new Error("flux d'octets attendu");
    }
    size += chunk.length;
    if (size > limit) {
      stream.destroy();
      return { ok: false, reason: "too-large" };
    }
    chunks.push(chunk);
  }
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    return { ok: true, text: decoder.decode(Buffer.concat(chunks)) };
  } catch {
    return { ok: false, reason: "not-utf8" };
  }
}
