import { createHash } from "node:crypto";
import type { Readable } from "node:stream";
import { parseSha256, type Sha256 } from "./fingerprint";
import { type ImageHeader, readImageHeader } from "./image-header";

export interface ImageDigest {
  sha256: Sha256;
  bytes: number;
  // `null` si le contenu n'est ni un JPEG ni un PNG lisible.
  header: ImageHeader | null;
}

// Les segments APPn (EXIF, profil ICC) précèdent les dimensions d'un JPEG et
// font rarement plus de quelques centaines de Ko.
export const IMAGE_HEADER_LIMIT = 1024 * 1024;

function sha256(hex: string): Sha256 {
  const value = parseSha256(hex);
  if (value === undefined) {
    throw new Error(`SHA-256 inattendu : ${hex}`);
  }
  return value;
}

// Hache l'image en flux et ne garde que ses premiers octets, le temps d'en
// lire le type et les dimensions.
export async function digestImage(
  stream: Readable,
  headerLimit = IMAGE_HEADER_LIMIT,
): Promise<ImageDigest> {
  const hash = createHash("sha256");
  const head = Buffer.alloc(headerLimit);
  let kept = 0;
  let bytes = 0;
  for await (const chunk of stream) {
    if (!Buffer.isBuffer(chunk)) {
      throw new Error("flux d'octets attendu");
    }
    hash.update(chunk);
    kept += chunk.copy(
      head,
      kept,
      0,
      Math.min(chunk.length, headerLimit - kept),
    );
    bytes += chunk.length;
  }
  return {
    sha256: sha256(hash.digest("hex")),
    bytes,
    header: readImageHeader(head.subarray(0, kept)),
  };
}
