import { Badge } from "@codegouvfr/react-dsfr/Badge";
import { CallOut } from "@codegouvfr/react-dsfr/CallOut";
import { Notice } from "@codegouvfr/react-dsfr/Notice";
import { Table } from "@codegouvfr/react-dsfr/Table";
import type { ReactNode } from "react";
import {
  depotsParSemaine,
  regions,
  revendications,
  tailleCommunes,
  totalCommunes,
  totalTemoignages,
} from "./_accueil/donnees-illustratives";
import { DsfrChart } from "./_accueil/dsfr-chart";

const nombre = new Intl.NumberFormat("fr-FR");

const regionsParTemoignages = [...regions].sort(
  (a, b) => b.temoignages - a.temoignages,
);

function Encart({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="h-full border border-[var(--border-default-grey)] fr-p-3w">
      <h2 className="fr-h5">{titre}</h2>
      {children}
    </section>
  );
}

function Chiffre({ valeur, libelle }: { valeur: string; libelle: string }) {
  return (
    <div className="fr-col-12 fr-col-md-4">
      <div className="h-full bg-[var(--background-alt-blue-france)] fr-p-3w">
        <p className="fr-h2 fr-mb-1v text-[var(--text-title-blue-france)]">
          {valeur}
        </p>
        <p className="fr-mb-0">{libelle}</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="fr-container fr-py-8w">
      <Badge severity="new" small>
        En construction
      </Badge>
      <h1 className="fr-mt-2w">Cahier en construction</h1>
      <p className="fr-text--lead fr-mb-4w">
        Cahiers citoyens rassemble les témoignages déposés dans les mairies de
        France lors des cahiers de doléances de l&apos;hiver 2018-2019, pour
        les rendre consultables par territoire et par revendication.
      </p>

      <Notice
        className="fr-mb-6w"
        title="Données d'illustration"
        description="Tous les chiffres de cette page sont fictifs. Ils servent à préfigurer l'accueil en attendant les vraies données."
      />

      <div className="fr-grid-row fr-grid-row--gutters fr-mb-6w">
        <Chiffre
          valeur={nombre.format(totalTemoignages)}
          libelle="témoignages recensés"
        />
        <Chiffre
          valeur={nombre.format(totalCommunes)}
          libelle="communes participantes"
        />
        <Chiffre
          valeur={String(regions.length)}
          libelle="régions, dont 5 d'outre-mer"
        />
      </div>

      <div className="fr-grid-row fr-grid-row--gutters fr-mb-6w">
        <div className="fr-col-12 fr-col-lg-6">
          <Encart titre="Témoignages par région">
            <DsfrChart
              tag="map-chart"
              label="carte des témoignages par région"
              attributes={{
                data: JSON.stringify(
                  Object.fromEntries(regions.map((r) => [r.code, r.temoignages])),
                ),
                value: String(totalTemoignages),
                name: "Témoignages recensés",
                level: "reg",
                "selected-palette": "sequentialAscending",
              }}
            />
          </Encart>
        </div>
        <div className="fr-col-12 fr-col-lg-6">
          <Encart titre="Revendications les plus citées">
            <DsfrChart
              tag="bar-chart"
              label="revendications les plus citées"
              aspectRatio={1.6}
              attributes={{
                x: JSON.stringify([revendications.themes]),
                y: JSON.stringify([revendications.mentions]),
                name: JSON.stringify(["Mentions"]),
                horizontal: "true",
                "unit-tooltip": "mentions",
              }}
            />
          </Encart>
        </div>
      </div>

      <div className="fr-grid-row fr-grid-row--gutters fr-mb-6w">
        <div className="fr-col-12 fr-col-lg-7">
          <Encart titre="Dépôts de témoignages par semaine">
            <DsfrChart
              tag="line-chart"
              label="dépôts de témoignages par semaine"
              aspectRatio={1.8}
              attributes={{
                x: JSON.stringify([depotsParSemaine.semaines]),
                y: JSON.stringify([depotsParSemaine.temoignages]),
                name: JSON.stringify(["Témoignages déposés"]),
                "unit-tooltip": "témoignages",
              }}
            />
          </Encart>
        </div>
        <div className="fr-col-12 fr-col-lg-5">
          <Encart titre="Communes participantes par taille">
            <DsfrChart
              tag="pie-chart"
              label="communes participantes par taille"
              aspectRatio={1.3}
              attributes={{
                x: JSON.stringify([tailleCommunes.tranches]),
                y: JSON.stringify([tailleCommunes.part]),
                name: JSON.stringify(tailleCommunes.tranches),
                "unit-tooltip": "%",
                "selected-palette": "categorical",
              }}
            />
          </Encart>
        </div>
      </div>

      <Table
        className="fr-mb-6w"
        caption="Témoignages et communes participantes par région"
        headers={[
          "Région",
          "Communes participantes",
          "Témoignages",
          "Revendication principale",
        ]}
        data={regionsParTemoignages.map((r) => [
          r.nom,
          nombre.format(r.communesParticipantes),
          nombre.format(r.temoignages),
          r.themePrincipal,
        ])}
        bordered
        fixed
      />

      <CallOut title="Vous êtes une mairie ?" titleAs="h2">
        Le dépôt des cahiers numérisés ouvrira prochainement. Chaque témoignage
        sera rattaché à sa commune et classé par revendication.
      </CallOut>
    </div>
  );
}
