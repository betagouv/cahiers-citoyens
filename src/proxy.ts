import { type NextRequest, NextResponse } from "next/server";
import { notebookExists, notebookIdFromPath } from "@/lib/notebooks";

// Avec Cache Components, le build précalcule l'enveloppe statique de
// `/notebooks/[id]` (gabarit, en-tête) et le serveur l'envoie dès la requête :
// le statut 200 part avant que la page ne lise la base, et le `notFound()` de
// la page ne peut plus le changer. L'existence du cahier se vérifie donc ici,
// avant tout rendu. Un id inconnu est réécrit vers la page 404 de
// l'application, servie avec le statut 404.
export async function proxy(request: NextRequest) {
  const id = notebookIdFromPath(request.nextUrl.pathname);
  if (id === undefined || (await notebookExists(id)))
    return NextResponse.next();
  return NextResponse.rewrite(new URL("/_not-found", request.url));
}

export const config = {
  matcher: "/notebooks/:id",
};
