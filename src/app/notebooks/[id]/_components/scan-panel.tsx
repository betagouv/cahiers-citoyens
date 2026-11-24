import { Button } from "@codegouvfr/react-dsfr/Button";

export function ScanPanel({ notebookId }: { notebookId: string }) {
  const scanUrl = `/notebooks/${notebookId}/scan`;
  return (
    <section className="fr-col-12 fr-col-lg-6" aria-labelledby="scan-title">
      <h2 id="scan-title" className="fr-h4">
        Scan
      </h2>
      <iframe
        src={scanUrl}
        title={`Scan du cahier ${notebookId} (PDF)`}
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
          title: `Ouvrir le scan du cahier ${notebookId} dans un nouvel onglet`,
        }}
      >
        Ouvrir le PDF
      </Button>
    </section>
  );
}
