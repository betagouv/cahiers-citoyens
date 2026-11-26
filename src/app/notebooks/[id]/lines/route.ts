import { listKeywordLines } from "@/lib/keyword-lines";
import { parseVersion } from "@/lib/page-image";
import { parseKeyword } from "@/lib/page-search/keyword";

// Un jour : l'adresse porte la version, dont les lignes ne changent pas.
// `private`, comme les images : aucun cache partagé ne garde un cahier retiré.
export const KEYWORD_LINES_CACHE_CONTROL = "private, max-age=86400";

// Les contours des lignes qui contiennent le mot-clé, page par page, pour le
// calque posé sur les images d'un cahier ouvert depuis la recherche.
export async function GET(
  request: Request,
  context: RouteContext<"/notebooks/[id]/lines">,
) {
  const { id } = await context.params;
  const params = new URL(request.url).searchParams;
  const version = parseVersion(params.get("v"));
  const keyword = parseKeyword(params.get("q") ?? undefined);
  if (version === undefined || keyword === "") {
    return Response.json(
      { error: "Version ou mot-clé invalide" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const lines = await listKeywordLines(id, version, keyword);
  return Response.json(
    { lines },
    { headers: { "Cache-Control": KEYWORD_LINES_CACHE_CONTROL } },
  );
}
