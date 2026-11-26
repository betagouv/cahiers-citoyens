import {
  badRequest,
  cachedJson,
  queryParam,
} from "@/lib/page-search/cached-json";
import { countPages } from "@/lib/page-search/count-pages";
import { parseKeyword } from "@/lib/page-search/keyword";
import { parseOptionalPlace } from "@/lib/page-search/place-codes";

// Nombre de pages que listera `/search?place=…&q=…`, pour le bouton du
// formulaire.
export async function GET(request: Request) {
  const place = parseOptionalPlace(queryParam(request, "place"));
  if (place === "invalid") return badRequest("Lieu invalide");
  const pageCount = await countPages(
    place,
    parseKeyword(queryParam(request, "q")),
  );
  return cachedJson({ pageCount });
}
