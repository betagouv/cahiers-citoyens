import { jpegSize } from "./jpeg-header";
import { pngSize } from "./png-header";

export const IMAGE_TYPES = ["jpeg", "png"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

export interface ImageHeader {
  type: ImageType;
  width: number;
  height: number;
}

// Le type se lit dans les premiers octets, jamais dans l'extension : un JPEG
// nommé `.png` est un JPEG.
export function readImageHeader(bytes: Uint8Array): ImageHeader | null {
  const png = pngSize(bytes);
  if (png !== null) {
    return { type: "png", ...png };
  }
  const jpeg = jpegSize(bytes);
  return jpeg === null ? null : { type: "jpeg", ...jpeg };
}
