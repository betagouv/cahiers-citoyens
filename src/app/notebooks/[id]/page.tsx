import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { formatDate, formatNumber } from "@/lib/format";
import { getNotebook } from "@/lib/notebooks";

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

function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "");
}

export default async function NotebookPage({
  params,
}: PageProps<"/notebooks/[id]">) {
  const { id } = await params;
  const notebook = await getNotebook(id);
  if (notebook === undefined) notFound();
  const scanUrl = `/notebooks/${notebook.id}/scan`;

  return (
    <div className="fr-container fr-py-6w">
      <Breadcrumb
        currentPageLabel={notebook.id}
        homeLinkProps={{ href: "/" }}
        segments={[{ label: "Les cahiers", linkProps: { href: "/notebooks" } }]}
      />
      <h1>Cahier {notebook.id}</h1>
      <p className="fr-text--lead">
        Ouvert le {formatDate(notebook.openedOn)} ·{" "}
        {formatNumber(notebook.chunkCount)} passages indexés pour la recherche
      </p>

      <div className="fr-grid-row fr-grid-row--gutters">
        <section className="fr-col-12 fr-col-lg-6" aria-labelledby="scan-title">
          <h2 id="scan-title" className="fr-h4">
            Scan
          </h2>
          <iframe
            src={scanUrl}
            title={`Scan du cahier ${notebook.id} (PDF)`}
            className="block h-[75vh] w-full border border-[var(--border-default-grey)]"
          />
          <Button
            className="fr-mt-2w"
            priority="secondary"
            size="small"
            iconId="fr-icon-external-link-line"
            iconPosition="right"
            linkProps={{
              href: scanUrl,
              target: "_blank",
              rel: "noopener",
              title: `Ouvrir le scan du cahier ${notebook.id} dans un nouvel onglet`,
            }}
          >
            Ouvrir le PDF
          </Button>
        </section>
        <section
          className="fr-col-12 fr-col-lg-6"
          aria-labelledby="transcription-title"
        >
          <h2 id="transcription-title" className="fr-h4">
            Transcription
          </h2>
          <div
            className="h-[75vh] overflow-y-auto border border-[var(--border-default-grey)] fr-p-3w"
            tabIndex={0}
            role="region"
            aria-label={`Transcription du cahier ${notebook.id}`}
          >
            {paragraphs(notebook.transcription).map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
