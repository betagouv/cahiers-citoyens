// Octets d'images minimales pour les tests : seul l'en-tête compte.

function uint16(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}

function uint32(value: number): number[] {
  return [...uint16(value >>> 16), ...uint16(value & 0xffff)];
}

export function pngBytes(width: number, height: number): Uint8Array {
  return new Uint8Array([
    ...[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    ...uint32(13),
    ...[0x49, 0x48, 0x44, 0x52],
    ...uint32(width),
    ...uint32(height),
    ...[8, 2, 0, 0, 0],
  ]);
}

export function segment(marker: number, payload: number[]): number[] {
  return [0xff, marker, ...uint16(payload.length + 2), ...payload];
}

// SOI, un segment APP0, puis le SOF demandé (C0 baseline, C2 progressif).
export function jpegBytes(
  width: number,
  height: number,
  sof = 0xc0,
  before: number[] = segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0]),
): Uint8Array {
  return new Uint8Array([
    0xff,
    0xd8,
    ...before,
    ...segment(sof, [8, ...uint16(height), ...uint16(width), 1, 1, 0x11, 0]),
    ...segment(0xda, [1, 1, 0, 0, 0x3f, 0]),
    0xff,
    0xd9,
  ]);
}
