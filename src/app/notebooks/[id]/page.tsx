import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";
import { formatNumber } from "@/lib/format";
import { notebookTitle } from "@/lib/notebook-place";
import { getNotebook } from "@/lib/notebooks";
import { NotebookPages } from "./_components/notebook-pages";

// La page lit la base hors de toute frontière Suspense : la navigation vers
// elle attend la base. Le statut 404 d'un id inconnu ou retiré est posé par
// `src/proxy.ts`, avant le rendu ; le `notFound()` ci-dessous ne sert qu'à un
// cahier retiré entre-temps.
export const instant = false;

function pageCountLabel(count: number): string {
  return count === 1 ? "1 page" : `${formatNumber(count)} pages`;
}

export async function generateMetadata({
  params,
}: PageProps<"/notebooks/[id]">): Promise<Metadata> {
  const { id } = await params;
  const notebook = await getNotebook(id);
  if (notebook === undefined) return { title: `Cahier ${id}` };
  const title = notebookTitle(id, notebook);
  return {
    title,
    description: `${title}. ${pageCountLabel(notebook.pages.length)} en image, chacune avec sa transcription.`,
  };
}

export default async function NotebookPage({
  params,
}: PageProps<"/notebooks/[id]">) {
  const { id } = await params;
  const notebook = await getNotebook(id);
  if (notebook === undefined) notFound();
  const title = notebookTitle(notebook.id, notebook);
  const { onlineVersion, pages } = notebook;
  return (
    <div className="fr-container fr-py-6w">
      <Breadcrumb
        currentPageLabel={title}
        homeLinkProps={{ href: "/" }}
        segments={[{ label: "Les cahiers", linkProps: { href: "/notebooks" } }]}
      />
      <h1>{title}</h1>
      <p className="fr-text--lead fr-mb-1w">
        {notebook.departmentName !== null && `${notebook.departmentName} · `}
        {pageCountLabel(pages.length)}
      </p>
      <p className="fr-text--sm text-[var(--text-mention-grey)]">
        Identifiant du cahier : {notebook.id}
      </p>
      {onlineVersion === null || pages.length === 0 ? (
        <p>Les pages de ce cahier ne sont pas encore en ligne.</p>
      ) : (
        <NotebookPages
          notebookId={notebook.id}
          version={onlineVersion}
          pages={pages}
        />
      )}
    </div>
  );
}
