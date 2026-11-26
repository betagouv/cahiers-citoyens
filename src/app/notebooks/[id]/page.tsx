import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";
import { formatDate, formatNumber } from "@/lib/format";
import { getNotebook } from "@/lib/notebooks";
import { ScanPanel } from "./_components/scan-panel";
import { TranscriptionPanel } from "./_components/transcription-panel";

// La page lit la base hors de toute frontière Suspense : la navigation vers
// elle attend la base. Le statut 404 d'un id inconnu est posé par
// `src/proxy.ts`, avant le rendu ; le `notFound()` ci-dessous ne sert qu'à un
// cahier supprimé entre-temps.
export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/notebooks/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Cahier ${id}` };
}

export default async function NotebookPage({
  params,
}: PageProps<"/notebooks/[id]">) {
  const { id } = await params;
  const notebook = await getNotebook(id);
  if (notebook === undefined) notFound();

  return (
    <div className="fr-container fr-py-6w">
      <Breadcrumb
        currentPageLabel={notebook.id}
        homeLinkProps={{ href: "/" }}
        segments={[{ label: "Les cahiers", linkProps: { href: "/notebooks" } }]}
      />
      <h1>Cahier {notebook.id}</h1>
      <p className="fr-text--lead">
        {notebook.openedOn !== null &&
          `Ouvert le ${formatDate(notebook.openedOn)} · `}
        {formatNumber(notebook.chunkCount)} passages indexés pour la recherche
      </p>

      {/* Un cahier venu d'un dépôt n'a ni scan ni transcription d'un bloc :
          ses pages s'afficheront en phase 8. */}
      <div className="fr-grid-row fr-grid-row--gutters">
        {notebook.hasScan && <ScanPanel notebookId={notebook.id} />}
        {notebook.transcription !== null && (
          <TranscriptionPanel
            notebookId={notebook.id}
            transcription={notebook.transcription}
          />
        )}
      </div>
    </div>
  );
}
