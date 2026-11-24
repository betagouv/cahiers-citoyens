import { connection } from "next/server";
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

export async function CorpusFigures() {
  // Rien d'autre ne lie ces chiffres à la requête : sans cet appel, le build
  // tenterait de les lire en base pour les figer dans la page statique.
  await connection();
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
