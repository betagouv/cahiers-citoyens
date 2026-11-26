// Les comptes ne changent qu'après un dépôt : une réponse peut resservir
// quelques minutes, au navigateur (retour arrière dans la saisie) comme à un
// cache partagé devant le serveur.
export const SEARCH_CACHE_CONTROL =
  "public, max-age=60, s-maxage=300, stale-while-revalidate=3600";

export const MAX_QUERY_LENGTH = 100;

export function cachedJson(body: unknown): Response {
  return Response.json(body, {
    headers: { "Cache-Control": SEARCH_CACHE_CONTROL },
  });
}

export function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400 });
}

// Un paramètre de requête, borné en longueur ; chaîne vide s'il manque.
export function queryParam(request: Request, name: string): string {
  const value = new URL(request.url).searchParams.get(name) ?? "";
  return value.slice(0, MAX_QUERY_LENGTH);
}
