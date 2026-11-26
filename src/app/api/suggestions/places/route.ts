import { cachedJson, queryParam } from "@/lib/page-search/cached-json";
import { suggestPlaces } from "@/lib/page-search/suggest-places";

// Propositions du champ « Lieu » : `?q=Char`.
export async function GET(request: Request) {
  const suggestions = await suggestPlaces(queryParam(request, "q"));
  return cachedJson({ suggestions });
}
