import type { ImageContentType } from "../ingestion/notebook";
import type { StoredObject } from "./s3-storage";

// Un an : l'adresse porte la version, et les images d'une version ne changent
// jamais. `private` garde l'image dans le navigateur seulement : aucun cache
// partagé ne la servirait encore après un retrait, que la route vérifie à
// chaque requête.
export const PAGE_IMAGE_CACHE_CONTROL = "private, max-age=31536000, immutable";

export function pageImageResponse(
  contentType: ImageContentType,
  image: StoredObject,
): Response {
  const headers = new Headers({
    "Content-Type": contentType,
    "Cache-Control": PAGE_IMAGE_CACHE_CONTROL,
    "X-Content-Type-Options": "nosniff",
  });
  if (image.contentLength !== undefined) {
    headers.set("Content-Length", String(image.contentLength));
  }
  if (image.etag !== undefined) headers.set("ETag", image.etag);
  return new Response(image.body, { headers });
}

// Une erreur n'est jamais gardée en cache : l'image peut revenir à la
// prochaine publication.
export function pageImageError(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
