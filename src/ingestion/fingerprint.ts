import { createHash } from "node:crypto";

export type Sha256 = string & { readonly __brand: "Sha256" };
export type Fingerprint = string & { readonly __brand: "Fingerprint" };

export interface FingerprintPage {
  page: number;
  imageSha256: Sha256;
  text: string;
}

const SHA256_HEX = /^[0-9a-f]{64}$/;

function isSha256(value: string): value is Sha256 {
  return SHA256_HEX.test(value);
}

function isFingerprint(value: string): value is Fingerprint {
  return SHA256_HEX.test(value);
}

export function parseSha256(value: string): Sha256 | undefined {
  return isSha256(value) ? value : undefined;
}

// Seuls l'ordre des pages, le contenu des images et les textes comptent :
// renommer une image ou changer `pipeline_release` ne republie rien.
export function notebookFingerprint(pages: FingerprintPage[]): Fingerprint {
  const canonical = JSON.stringify(
    pages.map(({ page, imageSha256, text }) => [page, imageSha256, text]),
  );
  const digest = createHash("sha256").update(canonical, "utf8").digest("hex");
  if (!isFingerprint(digest)) {
    throw new Error(`Empreinte SHA-256 inattendue : ${digest}`);
  }
  return digest;
}
