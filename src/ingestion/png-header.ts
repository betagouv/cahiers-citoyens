export interface ImageSize {
  width: number;
  height: number;
}

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
// Signature (8), longueur du bloc (4), « IHDR » (4), largeur (4), hauteur (4).
const IHDR_END = 24;

export function isPng(bytes: Uint8Array): boolean {
  return SIGNATURE.every((byte, i) => bytes[i] === byte);
}

function readUint32(bytes: Uint8Array, at: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset).getUint32(at);
}

// Le premier bloc d'un PNG est IHDR, qui porte les dimensions.
export function pngSize(bytes: Uint8Array): ImageSize | null {
  if (!isPng(bytes) || bytes.length < IHDR_END) {
    return null;
  }
  const type = String.fromCharCode(...bytes.subarray(12, 16));
  const width = readUint32(bytes, 16);
  const height = readUint32(bytes, 20);
  if (type !== "IHDR" || width === 0 || height === 0) {
    return null;
  }
  return { width, height };
}
