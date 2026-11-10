import { getScanKey } from "@/lib/notebooks";
import {
  StorageNotConfiguredError,
  openScan,
  parseByteRange,
} from "@/lib/scan-storage";

// Le PDF transite par ce serveur au lieu d'une redirection vers une URL
// présignée : le stockage répond `X-Frame-Options: SAMEORIGIN`, ce qui
// interdit d'afficher le scan dans la page depuis son domaine. En prime,
// aucun lien direct vers le bucket ne sort du serveur.
export async function GET(
  request: Request,
  context: RouteContext<"/notebooks/[id]/scan">,
) {
  const { id } = await context.params;
  const scanKey = await getScanKey(id);
  if (scanKey === undefined) {
    return new Response("Cahier introuvable", { status: 404 });
  }

  let scan;
  try {
    scan = await openScan(
      scanKey,
      parseByteRange(request.headers.get("range")),
      request.signal,
    );
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      console.error(`Scan de ${id} indisponible : ${error.message}`);
      return new Response("Stockage des scans non configuré", { status: 503 });
    }
    console.error(`Scan de ${id} illisible dans le stockage`, error);
    return new Response("Stockage des scans indisponible", { status: 502 });
  }
  if (scan === undefined) {
    return new Response("Scan introuvable", { status: 404 });
  }

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
