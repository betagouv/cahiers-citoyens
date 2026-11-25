import Link from "next/link";
import { fr } from "@codegouvfr/react-dsfr";
import { Tag } from "@codegouvfr/react-dsfr/Tag";
import { Tile } from "@codegouvfr/react-dsfr/Tile";
import Archive from "@codegouvfr/react-dsfr/picto/Archive";
import Information from "@codegouvfr/react-dsfr/picto/Information";
import LocationFrance from "@codegouvfr/react-dsfr/picto/LocationFrance";
import { DepartmentMap } from "@/app/_components/department-map";
import { HomeSearchForm } from "@/app/_components/home-search-form";
import { mapPalette } from "@/lib/department-map-style";
import {
  PUBLICATION_STATUSES,
  PUBLICATION_STATUS_LABELS,
  PUBLISHED_AREAS,
  areaHref,
  onlineMetropolitanDepartmentCount,
} from "@/lib/departments";

const legendPalette = mapPalette(fr.colors.decisions);

const READING_TILES = [
  {
    title: "Comprendre les cahiers",
    desc: "D'où viennent ces cahiers, ce qu'ils contiennent et ce qu'ils ne disent pas.",
    href: "/understanding",
    pictogram: <Archive />,
  },
  {
    title: "Publication des cahiers",
    desc: "Les territoires en ligne et la façon dont la publication avance.",
    href: "/publication",
    pictogram: <LocationFrance />,
  },
  {
    title: "Questions fréquentes",
    desc: "Transcription, données personnelles, réutilisation des textes.",
    href: "/faq",
    pictogram: <Information />,
  },
];

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

// Sur mobile, l'ordre du DOM : présentation, carte, puis liste des
// départements ; sur grand écran, la carte occupe seule la colonne de gauche.
function OnlineSection() {
  return (
    <section
      aria-labelledby="online-title"
      className="fr-container fr-py-8w grid grid-cols-1 gap-x-12 gap-y-6 md:grid-cols-2"
    >
      <div className="md:col-start-2 md:row-start-1 md:self-end">
        <h2 id="online-title">Ce qui est en ligne</h2>
        <p className="fr-mb-0">
          Environ 5 % des cahiers numérisés sont consultables aujourd&apos;hui,
          dans {onlineMetropolitanDepartmentCount()} départements et les
          outre-mer. Sélectionnez un département pour lire ses cahiers.
        </p>
      </div>
      <div className="md:col-start-1 md:row-span-2 md:row-start-1 md:self-center">
        <DepartmentMap />
        <MapLegend />
        <p className="fr-text--xs fr-mt-1w fr-mb-0 text-[var(--text-mention-grey)]">
          Limites administratives : © DINUM (data.gouv.fr)
        </p>
      </div>
      <div className="md:col-start-2 md:row-start-2 md:self-start">
        <h3 className="fr-text--md fr-text--bold fr-mb-2w">
          Lire les cahiers d&apos;un département
        </h3>
        <ul className="fr-tags-group">
          {PUBLISHED_AREAS.map((area) => (
            <li key={area.label}>
              <Tag linkProps={{ href: areaHref(area) }}>{area.label}</Tag>
            </li>
          ))}
        </ul>
        <Link className={fr.cx("fr-link")} href="/publication">
          Voir l&apos;état de publication de tous les départements
        </Link>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <section
        aria-labelledby="home-title"
        className="bg-[var(--background-contrast-brown-caramel)]"
      >
        <div className="fr-container fr-py-8w">
          <h1 id="home-title" className="text-center">
            Rechercher des cahiers citoyens
          </h1>
          <p className="fr-text--lg mx-auto max-w-[40rem] text-center">
            En 2019, des habitants ont écrit dans des cahiers ouverts en mairie.
            Ces cahiers sont numérisés, transcrits et mis en ligne
            progressivement.
          </p>
          <div className="fr-p-4w bg-[var(--background-default-grey)] shadow-[var(--raised-shadow)]">
            <HomeSearchForm />
          </div>
        </div>
      </section>

      <OnlineSection />

      <section
        aria-labelledby="reading-title"
        className="bg-[var(--background-action-high-blue-france)]"
      >
        <div className="fr-container fr-py-8w">
          <h2
            id="reading-title"
            className="text-[var(--text-inverted-blue-france)]"
          >
            Pour bien lire les cahiers
          </h2>
          <div className="fr-grid-row fr-grid-row--gutters">
            {READING_TILES.map((tile) => (
              <div key={tile.href} className="fr-col-12 fr-col-md-4">
                <Tile
                  title={tile.title}
                  titleAs="h3"
                  desc={tile.desc}
                  linkProps={{ href: tile.href }}
                  pictogram={tile.pictogram}
                  orientation="horizontal"
                  enlargeLinkOrButton
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
