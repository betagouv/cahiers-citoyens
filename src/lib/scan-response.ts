import type { ScanObject } from "./scan-storage";

// Réponse HTTP du scan PDF d'un cahier, affiché dans la page (`inline`) :
// 206 pour une plage demandée, 200 pour le fichier entier.
export function scanResponse(id: string, scan: ScanObject): Response {
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${id}.pdf"`,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  });
  if (scan.contentLength !== undefined) {
    headers.set("Content-Length", String(scan.contentLength));
  }
  if (scan.contentRange !== undefined) {
    headers.set("Content-Range", scan.contentRange);
  }
  if (scan.etag !== undefined) headers.set("ETag", scan.etag);
  return new Response(scan.body, {
    status: scan.contentRange === undefined ? 200 : 206,
    headers,
  });
}
