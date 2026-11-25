import type { Canvas } from "@napi-rs/canvas";

// Condorcet livre des JPEG nommés `.png` : la plateforme lit le type dans les
// premiers octets, jamais dans l'extension. On produit aussi de vrais PNG et
// des JPEG nommés `.jpg`.
export const IMAGE_STYLES = ["jpeg-named-png", "png", "jpg"] as const;

export type ImageStyle = (typeof IMAGE_STYLES)[number];

export interface PageImage {
  bytes: Uint8Array;
  extension: "png" | "jpg";
}

const JPEG_QUALITY = 80;

export async function encodePage(
  canvas: Canvas,
  style: ImageStyle,
): Promise<PageImage> {
  switch (style) {
    case "jpeg-named-png":
      return {
        bytes: await canvas.encode("jpeg", JPEG_QUALITY),
        extension: "png",
      };
    case "png":
      return { bytes: await canvas.encode("png"), extension: "png" };
    case "jpg":
      return {
        bytes: await canvas.encode("jpeg", JPEG_QUALITY),
        extension: "jpg",
      };
  }
}
