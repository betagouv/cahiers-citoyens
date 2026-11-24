import type { ReactNode } from "react";
import { prerender } from "react-dom/static";

// Rend un arbre React en HTML après avoir attendu ses composants asynchrones,
// y compris sous Suspense : le HTML final, pas les fallbacks. Les commentaires
// que React insère pour l'hydratation (`<!-- -->`, `<!--$-->`) sont retirés.
export async function renderToHtml(node: ReactNode): Promise<string> {
  const { prelude } = await prerender(node);
  const html = await new Response(prelude).text();
  return html.replace(/<!--.*?-->/g, "");
}
