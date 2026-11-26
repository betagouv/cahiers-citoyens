import {
  badRequest,
  cachedJson,
  queryParam,
} from "@/lib/page-search/cached-json";
import { parseOptionalPlace } from "@/lib/page-search/place-codes";
import { suggestWords } from "@/lib/page-search/suggest-words";

// Propositions du champ « Mot-clé » : `?q=retr&place=71106`, `place`
// facultatif (France entière).
export async function GET(request: Request) {
  const place = parseOptionalPlace(queryParam(request, "place"));
  if (place === "invalid") return badRequest("Lieu invalide");
  const suggestions = await suggestWords(queryParam(request, "q"), place);
  return cachedJson({ suggestions });
}
