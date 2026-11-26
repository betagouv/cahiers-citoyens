// Adresses d'un cahier et de ses pages, partagées par la page du cahier, la
// liste et les deux recherches.

export function pageAnchor(page: number): string {
  return `page-${page}`;
}

// `/notebooks/<id>`, ou `/notebooks/<id>#page-3` pour citer une page.
// `?q=<mot>` fait surligner le mot-clé cherché dans le cahier.
export function notebookHref(
  id: string,
  page?: number | null,
  keyword = "",
): string {
  const path = `/notebooks/${encodeURIComponent(id)}`;
  const query = keyword === "" ? "" : `?${new URLSearchParams({ q: keyword })}`;
  const hash =
    page === undefined || page === null ? "" : `#${pageAnchor(page)}`;
  return `${path}${query}${hash}`;
}

// L'image d'une page de la version en ligne. La version rend l'adresse
// propre à un contenu : la route peut la faire garder longtemps en cache.
export function pageImageSrc(id: string, page: number, version: number) {
  return `/notebooks/${encodeURIComponent(id)}/pages/${page}?v=${version}`;
}

// Les lignes d'une version qui contiennent le mot-clé, à superposer aux images.
export function keywordLinesSrc(id: string, version: number, keyword: string) {
  return `/notebooks/${encodeURIComponent(id)}/lines?${new URLSearchParams({ v: String(version), q: keyword })}`;
}
