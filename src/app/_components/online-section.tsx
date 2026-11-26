import type { ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { fr } from "@codegouvfr/react-dsfr";
import { Tag } from "@codegouvfr/react-dsfr/Tag";
import { DepartmentMap } from "@/app/_components/department-map";
import { mapPalette } from "@/lib/department-map-style";
import {
  type OnlineDepartment,
  PUBLICATION_STATUSES,
  PUBLICATION_STATUS_LABELS,
} from "@/lib/departments";
import { listOnlineDepartments } from "@/lib/online-departments";
import { onlineSummary } from "@/lib/online-summary";
import { areaHref, publishedAreas } from "@/lib/published-areas";

const legendPalette = mapPalette(fr.colors.decisions);

function MapLegend() {
  return (
    <ul className="fr-raw-list fr-mt-2w flex flex-wrap gap-x-4 gap-y-1">
      {PUBLICATION_STATUSES.map((status) => (
        <li
          key={status}
          className="fr-text--xs fr-mb-0 flex items-center gap-2"
        >
          <span
            aria-hidden="true"
            className="inline-block size-3 rounded-full"
            style={{ background: legendPalette.status[status].fill }}
          />
          {PUBLICATION_STATUS_LABELS[status]}
        </li>
      ))}
    </ul>
  );
}

function PublicationLink() {
  return (
    <Link className={fr.cx("fr-link")} href="/publication">
      Voir l&apos;état de publication de tous les départements
    </Link>
  );
}

function AreaTags({
  departments,
}: {
  departments: readonly OnlineDepartment[];
}) {
  const areas = publishedAreas(departments);
  if (areas.length === 0) return <PublicationLink />;
  return (
    <>
      <h3 className="fr-text--md fr-text--bold fr-mb-2w">
        Lire les cahiers d&apos;un département
      </h3>
      <ul className="fr-tags-group">
        {areas.map((area) => (
          <li key={area.label}>
            <Tag linkProps={{ href: areaHref(area) }}>{area.label}</Tag>
          </li>
        ))}
      </ul>
      <PublicationLink />
    </>
  );
}

interface OnlineLayoutProps {
  intro: ReactNode;
  map: ReactNode;
  areas?: ReactNode;
}

// Sur mobile, l'ordre du DOM : présentation, carte, puis liste des
// départements ; sur grand écran, la carte occupe seule la colonne de gauche.
function OnlineLayout({ intro, map, areas }: OnlineLayoutProps) {
  return (
    <section
      aria-labelledby="online-title"
      className="fr-container fr-py-8w grid grid-cols-1 gap-x-12 gap-y-6 md:grid-cols-2"
    >
      <div className="md:col-start-2 md:row-start-1 md:self-end">
        <h2 id="online-title">Ce qui est en ligne</h2>
        {intro}
      </div>
      <div className="md:col-start-1 md:row-span-2 md:row-start-1 md:self-center">
        {map}
        <MapLegend />
        <p className="fr-text--xs fr-mt-1w fr-mb-0 text-[var(--text-mention-grey)]">
          Limites administratives : © DINUM (data.gouv.fr)
        </p>
      </div>
      <div className="md:col-start-2 md:row-start-2 md:self-start">{areas}</div>
    </section>
  );
}

export function OnlineSectionView({
  departments,
}: {
  departments: readonly OnlineDepartment[];
}) {
  return (
    <OnlineLayout
      intro={<p className="fr-mb-0">{onlineSummary(departments)}</p>}
      map={<DepartmentMap departments={departments} />}
      areas={<AreaTags departments={departments} />}
    />
  );
}

// Le titre reste dans la coquille statique pendant que la base répond.
export function OnlineSectionFallback() {
  return (
    <OnlineLayout
      intro={
        <p role="status" className="fr-mb-0">
          Chargement des départements en ligne…
        </p>
      }
      map={
        // Même hauteur que `DepartmentMap`, pour que rien ne bouge à l'arrivée.
        <div aria-hidden="true" className="h-[18rem] md:h-[26rem]" />
      }
    />
  );
}

// `connection` garde la lecture hors du prérendu de `next build`, qui tourne
// sans base : la section arrive à la requête, servie par le cache.
export async function OnlineSection() {
  await connection();
  const departments = await listOnlineDepartments();
  return <OnlineSectionView departments={departments} />;
}
