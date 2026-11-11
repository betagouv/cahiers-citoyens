import { Suspense } from "react";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { Notice } from "@codegouvfr/react-dsfr/Notice";
import { SearchForm } from "@/app/_components/search-form";
import { formatMonthRange, formatNumber, formatShare } from "@/lib/format";
import { getCorpusStats } from "@/lib/notebooks";

function KeyFigure({ value, label }: { value: string; label: string }) {
  return (
    <div className="fr-col-12 fr-col-sm-6 fr-col-lg-3">
      <div className="h-full bg-[var(--background-alt-blue-france)] fr-p-3w">
        <p className="fr-h3 fr-mb-1v text-[var(--text-title-blue-france)]">
          {value}
        </p>
        <p className="fr-mb-0">{label}</p>
      </div>
    </div>
  );
}

async function CorpusFigures() {
  const stats = await getCorpusStats();
  if (
    stats.notebookCount === 0 ||
    stats.firstOpenedOn === null ||
    stats.lastOpenedOn === null
  ) {
    return <p>Aucun cahier n&apos;a encore été chargé.</p>;
  }
  return (
    <div className="fr-grid-row fr-grid-row--gutters">
      <KeyFigure
        value={formatNumber(stats.notebookCount)}
        label="cahiers numérisés"
      />
      <KeyFigure
        value={formatNumber(stats.chunkCount)}
        label="contributions transcrites"
      />
      <KeyFigure
        value={formatMonthRange(stats.firstOpenedOn, stats.lastOpenedOn)}
        label="période d'ouverture des cahiers"
      />
      <KeyFigure
        value={formatShare(stats.embeddedChunkCount, stats.chunkCount)}
        label="des contributions indexées pour la recherche"
      />
    </div>
  );
}

export default function Home() {
  return (
    <div className="fr-container fr-py-8w">
      <h1>Cahiers citoyens</h1>
      <p className="fr-text--lead">
        Pendant l&apos;hiver 2018-2019, des mairies ont ouvert des cahiers de
        doléances où les habitants ont écrit leurs attentes. Ces cahiers sont
        ici numérisés et transcrits : posez une question, la recherche retrouve
        les contributions qui en parlent et en rédige une synthèse sourcée.
      </p>

      <SearchForm id="home-search" big />

      <Notice
        className="fr-mt-4w"
        title="Cahiers fictifs"
        description="Les cahiers consultables aujourd'hui sont fictifs : ils servent à mettre au point la recherche en attendant les cahiers numérisés."
      />

      <section aria-labelledby="corpus-title" className="fr-mt-6w">
        <h2 id="corpus-title" className="fr-h4">
          Le corpus en chiffres
        </h2>
        <Suspense fallback={<p role="status">Chargement des chiffres…</p>}>
          <CorpusFigures />
        </Suspense>
      </section>

      <Button
        className="fr-mt-4w"
        priority="secondary"
        iconId="fr-icon-arrow-right-line"
        iconPosition="right"
        linkProps={{ href: "/notebooks" }}
      >
        Parcourir les cahiers
      </Button>
    </div>
  );
}
