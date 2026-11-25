import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";
import { NotebookTable } from "./_components/notebook-table";

export const metadata: Metadata = { title: "Les cahiers" };

export default function NotebooksPage({
  searchParams,
}: PageProps<"/notebooks">) {
  return (
    <div className="fr-container fr-py-6w">
      <Breadcrumb
        currentPageLabel="Les cahiers"
        homeLinkProps={{ href: "/" }}
        segments={[]}
      />
      <h1>Les cahiers</h1>
      <p className="fr-text--lead">
        Chaque cahier rassemble les contributions déposées dans une mairie. La
        recherche les découpe en passages. Ouvrez-en un pour lire son scan et sa
        transcription côte à côte.
      </p>
      <Suspense fallback={<p role="status">Chargement des cahiers…</p>}>
        <NotebookTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
