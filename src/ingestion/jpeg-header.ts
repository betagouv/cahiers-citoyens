import type { ImageSize } from "./png-header";

const MARKER = 0xff;
const SOI = 0xd8;
const EOI = 0xd9;
const SOS = 0xda;
const TEM = 0x01;

export function isJpeg(bytes: Uint8Array): boolean {
  return bytes[0] === MARKER && bytes[1] === SOI;
}

// SOF0 à SOF15, sauf DHT (C4), JPG (C8) et DAC (CC) : baseline,
// progressif, sans perte, arithmétique.
function isStartOfFrame(marker: number): boolean {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    marker !== 0xc4 &&
    marker !== 0xc8 &&
    marker !== 0xcc
  );
}

// Marqueurs sans longueur : TEM et RST0 à RST7.
function isStandalone(marker: number): boolean {
  return marker === TEM || (marker >= 0xd0 && marker <= 0xd7);
}

function readUint16(bytes: Uint8Array, at: number): number {
  return (bytes[at] << 8) | bytes[at + 1];
}

// Parcourt les segments (APPn, DQT, DHT…) jusqu'au premier SOFn, qui porte
// la hauteur puis la largeur. `null` si l'en-tête est tronqué ou si les
// données d'image (SOS) commencent avant.
export function jpegSize(bytes: Uint8Array): ImageSize | null {
  if (!isJpeg(bytes)) {
    return null;
  }
  let at = 2;
  while (at + 1 < bytes.length) {
    if (bytes[at] !== MARKER) {
      return null;
    }
    const marker = bytes[at + 1];
    if (marker === MARKER) {
      // Octet de remplissage avant un marqueur.
      at += 1;
    } else if (isStandalone(marker)) {
      at += 2;
    } else if (marker === SOS || marker === EOI || marker === SOI) {
      return null;
    } else if (isStartOfFrame(marker)) {
      return frameSize(bytes, at + 4);
    } else {
      at += 2 + segmentLength(bytes, at + 2);
    }
  }
  return null;
}

// Une longueur illisible ou inférieure à 2 envoie au-delà du tampon.
function segmentLength(bytes: Uint8Array, at: number): number {
  const length = at + 1 < bytes.length ? readUint16(bytes, at) : 0;
  return length >= 2 ? length : bytes.length;
}

// Après la longueur du segment SOF : précision (1), hauteur (2), largeur (2).
function frameSize(bytes: Uint8Array, at: number): ImageSize | null {
  if (at + 5 > bytes.length) {
    return null;
  }
  const height = readUint16(bytes, at + 1);
  const width = readUint16(bytes, at + 3);
  // Une hauteur nulle annonce un segment DNL, que la plateforme n'accepte pas.
  return width === 0 || height === 0 ? null : { width, height };
}
