import Link from "next/link";

export default function NotebookNotFound() {
  return (
    <div className="fr-container fr-py-6w">
      <h1>Cahier introuvable</h1>
      <p>Aucun cahier ne porte cet identifiant.</p>
      <Link href="/notebooks" className="fr-link">
        Voir la liste des cahiers
      </Link>
    </div>
  );
}
