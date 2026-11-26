import { Suspense } from "react";
import { Tile } from "@codegouvfr/react-dsfr/Tile";
import Archive from "@codegouvfr/react-dsfr/picto/Archive";
import Information from "@codegouvfr/react-dsfr/picto/Information";
import LocationFrance from "@codegouvfr/react-dsfr/picto/LocationFrance";
import { HomeSearchForm } from "@/app/_components/home-search-form";
import {
  OnlineSection,
  OnlineSectionFallback,
} from "@/app/_components/online-section";

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

      <Suspense fallback={<OnlineSectionFallback />}>
        <OnlineSection />
      </Suspense>

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
