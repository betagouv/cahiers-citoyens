import { getPageImage, parsePageImageTarget } from "@/lib/page-image";
import { pageImageError, pageImageResponse } from "@/lib/page-image-response";
import { StorageNotConfiguredError, openObject } from "@/lib/s3-storage";

// L'image transite par ce serveur : le bucket reste privé, et la base décide
// à chaque requête de ce qui est visible. Un cahier retiré, une page absente
// ou une version qui n'est plus en ligne répondent 404.
export async function GET(
  request: Request,
  context: RouteContext<"/notebooks/[id]/pages/[page]">,
) {
  const { id, page } = await context.params;
  const target = parsePageImageTarget(
    page,
    new URL(request.url).searchParams.get("v"),
  );
  const image =
    target === undefined ? undefined : await getPageImage(id, target);
  if (image === undefined) return pageImageError("Image introuvable", 404);
  let object;
  try {
    object = await openObject(image.key, request.signal);
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      console.error(`Image ${image.key} indisponible : ${error.message}`);
      return pageImageError("Stockage des images non configuré", 503);
    }
    console.error(`Image ${image.key} illisible dans le stockage`, error);
    return pageImageError("Stockage des images indisponible", 502);
  }
  if (object === undefined) return pageImageError("Image introuvable", 404);
  return pageImageResponse(image.contentType, object);
}
