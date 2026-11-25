import { createHash } from "node:crypto";
import type { NotebookMetadata, Page } from "./notebook";

export type Sha256 = string & { readonly __brand: "Sha256" };
export type Fingerprint = string & { readonly __brand: "Fingerprint" };

export interface FingerprintPage extends Page {
  imageSha256: Sha256;
}

export interface FingerprintInput {
  metadata: NotebookMetadata;
  pages: FingerprintPage[];
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

function canonicalMetadata(metadata: NotebookMetadata): string[] {
  return [
    metadata.department,
    metadata.departmentCode,
    metadata.municipality,
    metadata.inseeCode,
    metadata.postalCode,
    metadata.typedTranscription,
    metadata.handwrittenTranscription,
  ];
}

function canonicalPage(page: FingerprintPage): unknown[] {
  return [
    page.number,
    page.width,
    page.height,
    page.imageSha256,
    page.lines.map(({ text, kind, zone, polygon }) => [
      text,
      kind,
      zone,
      polygon,
    ]),
  ];
}

// Tout ce que le site affiche compte : métadonnées, numéros et dimensions des
// pages, contenu des images, lignes dans l'ordre. Les identifiants de page et de
// ligne (dérivés du numéro), `schema_version`, les noms de fichiers et les dates
// n'en font pas partie : les changer seuls ne republie rien.
export function notebookFingerprint({
  metadata,
  pages,
}: FingerprintInput): Fingerprint {
  const canonical = JSON.stringify([
    canonicalMetadata(metadata),
    pages.map(canonicalPage),
  ]);
  const digest = createHash("sha256").update(canonical, "utf8").digest("hex");
  if (!isFingerprint(digest)) {
    throw new Error(`Empreinte SHA-256 inattendue : ${digest}`);
  }
  return digest;
}
