import type { Metadata } from "next";
import { Button } from "@codegouvfr/react-dsfr/Button";

export const metadata: Metadata = { title: "Page introuvable" };

// Page d'erreur 404 du DSFR : adresse inconnue ou cahier qui n'existe pas.
export default function NotFound() {
  return (
    <div className="fr-container fr-py-8w">
      <h1>Page introuvable</h1>
      <p className="fr-text--sm fr-mb-3w">Erreur 404</p>
      <p className="fr-text--lead">
        La page ou le cahier que vous cherchez est introuvable.
      </p>
      <p>
        Si vous avez saisi l&apos;adresse, vérifiez-la. Sinon, parcourez la
        liste des cahiers ou posez votre question dans la recherche.
      </p>
      <ul className="fr-btns-group fr-btns-group--inline-md">
        <li>
          <Button linkProps={{ href: "/notebooks" }}>
            Parcourir les cahiers
          </Button>
        </li>
        <li>
          <Button priority="secondary" linkProps={{ href: "/search" }}>
            Rechercher dans les cahiers
          </Button>
        </li>
      </ul>
    </div>
  );
}
