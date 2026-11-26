import Link from "next/link";
import { fr } from "@codegouvfr/react-dsfr";

// Pourquoi une recherche peut ne rien trouver.
export function NoPages() {
  return (
    <p>
      Les cahiers sont publiés progressivement : certaines communes n’en ont pas
      encore en ligne. La recherche trouve les mots tels qu’ils sont écrits :
      essayez une autre forme du mot, au pluriel ou avec un accent.{" "}
      <Link className={fr.cx("fr-link")} href="/publication">
        Voir l’état de publication
      </Link>
    </p>
  );
}
