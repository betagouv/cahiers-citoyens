import Link from "next/link";
import { Pagination } from "@codegouvfr/react-dsfr/Pagination";
import { Table } from "@codegouvfr/react-dsfr/Table";
import { formatDate, formatNumber } from "@/lib/format";
import { listNotebooks, parsePageNumber } from "@/lib/notebooks";

export async function NotebookTable({
  searchParams,
}: Pick<PageProps<"/notebooks">, "searchParams">) {
  const { page: rawPage } = await searchParams;
  const { notebooks, page, pageCount, total } = await listNotebooks(
    parsePageNumber(rawPage),
  );
  if (total === 0) {
    return <p>Aucun cahier n&apos;a encore été chargé.</p>;
  }
  return (
    <>
      <p>
        {formatNumber(total)} cahiers, page {page} sur {pageCount}.
      </p>
      <Table
        caption="Cahiers numérisés"
        noCaption
        headers={["Cahier", "Ouvert le", "Passages indexés"]}
        data={notebooks.map((notebook) => [
          <Link key="id" href={`/notebooks/${notebook.id}`}>
            {notebook.id}
          </Link>,
          notebook.openedOn === null
            ? "Non renseignée"
            : formatDate(notebook.openedOn),
          formatNumber(notebook.chunkCount),
        ])}
        bordered
        fixed
      />
      {pageCount > 1 && (
        <Pagination
          count={pageCount}
          defaultPage={page}
          getPageLinkProps={(pageNumber) => ({
            href: `/notebooks?page=${pageNumber}`,
          })}
          className="fr-mt-4w"
        />
      )}
    </>
  );
}
