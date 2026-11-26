import Image from "next/image";
import type { PageContent } from "@/lib/notebooks";
import { LineOverlay } from "./line-overlay";

// L'image numérisée d'une page, les lignes du mot cherché teintées par-dessus,
// et le lien vers l'image seule.
export function PageScan({
  src,
  page,
  first,
  lines,
}: {
  src: string;
  page: PageContent;
  // La première image est la plus grande du premier écran : chargée tout de
  // suite. Les suivantes attendent le défilement.
  first: boolean;
  lines: readonly string[];
}) {
  return (
    <>
      <div className="relative border border-[var(--border-default-grey)]">
        <Image
          src={src}
          alt={`Image numérisée de la page ${page.number}, transcrite à la suite`}
          width={page.width}
          height={page.height}
          sizes="(min-width: 768px) 50vw, 100vw"
          loading={first ? "eager" : "lazy"}
          fetchPriority={first ? "high" : "auto"}
          unoptimized
          className="block h-auto w-full"
        />
        {lines.length > 0 && (
          <LineOverlay width={page.width} height={page.height} lines={lines} />
        )}
      </div>
      <p className="fr-text--sm fr-mt-1w fr-mb-0">
        <a href={src} className="fr-link fr-link--sm">
          Ouvrir l&apos;image de la page {page.number} en grand
        </a>
      </p>
    </>
  );
}
