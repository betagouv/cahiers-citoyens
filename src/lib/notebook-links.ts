// Adresses d'un cahier et de ses pages, partagées par la page du cahier, la
// liste et les deux recherches.

export function pageAnchor(page: number): string {
  return `page-${page}`;
}

// `/notebooks/<id>`, ou `/notebooks/<id>#page-3` pour citer une page.
export function notebookHref(id: string, page?: number | null): string {
  const path = `/notebooks/${encodeURIComponent(id)}`;
  return page === undefined || page === null
    ? path
    : `${path}#${pageAnchor(page)}`;
}

// L'image d'une page de la version en ligne. La version rend l'adresse
// propre à un contenu : la route peut la faire garder longtemps en cache.
export function pageImageSrc(id: string, page: number, version: number) {
  return `/notebooks/${encodeURIComponent(id)}/pages/${page}?v=${version}`;
}
