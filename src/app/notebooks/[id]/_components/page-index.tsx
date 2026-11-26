import { pageAnchor } from "@/lib/notebook-links";
import type { PageContent } from "@/lib/notebooks";

// Accès direct à chaque page, au clavier comme à la souris. Le numéro suffit
// à l'œil ; « Page » le précède pour les lecteurs d'écran.
export function PageIndex({ pages }: { pages: PageContent[] }) {
  return (
    <nav aria-labelledby="page-index-title" className="fr-mb-4w">
      <h2 id="page-index-title" className="fr-h6 fr-mb-1w">
        Aller à une page
      </h2>
      <ul className="fr-tags-group">
        {pages.map(({ number }) => (
          <li key={number}>
            <a className="fr-tag" href={`#${pageAnchor(number)}`}>
              <span className="fr-sr-only">Page </span>
              {number}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
