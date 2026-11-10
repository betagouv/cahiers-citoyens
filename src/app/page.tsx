import { Badge } from "@codegouvfr/react-dsfr/Badge";
import { CallOut } from "@codegouvfr/react-dsfr/CallOut";
import { Notice } from "@codegouvfr/react-dsfr/Notice";
import { Table } from "@codegouvfr/react-dsfr/Table";
import type { ReactNode } from "react";
import {
  depositsPerWeek,
  regions,
  demands,
  municipalitySizes,
  totalMunicipalities,
  totalTestimonies,
} from "./_home/sample-data";
import { DsfrChart } from "./_home/dsfr-chart";

const numberFormat = new Intl.NumberFormat("fr-FR");

const regionsByTestimonies = [...regions].sort(
  (a, b) => b.testimonies - a.testimonies,
);

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="h-full border border-[var(--border-default-grey)] fr-p-3w">
      <h2 className="fr-h5">{title}</h2>
      {children}
    </section>
  );
}

function KeyFigure({ value, label }: { value: string; label: string }) {
  return (
    <div className="fr-col-12 fr-col-md-4">
      <div className="h-full bg-[var(--background-alt-blue-france)] fr-p-3w">
        <p className="fr-h2 fr-mb-1v text-[var(--text-title-blue-france)]">
          {value}
        </p>
        <p className="fr-mb-0">{label}</p>
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
        France lors des cahiers de doléances de l&apos;hiver 2018-2019, pour les
        rendre consultables par territoire et par revendication.
      </p>

      <Notice
        className="fr-mb-6w"
        title="Données d'illustration"
        description="Tous les chiffres de cette page sont fictifs. Ils servent à préfigurer l'accueil en attendant les vraies données."
      />

      <div className="fr-grid-row fr-grid-row--gutters fr-mb-6w">
        <KeyFigure
          value={numberFormat.format(totalTestimonies)}
          label="témoignages recensés"
        />
        <KeyFigure
          value={numberFormat.format(totalMunicipalities)}
          label="communes participantes"
        />
        <KeyFigure
          value={String(regions.length)}
          label="régions, dont 5 d'outre-mer"
        />
      </div>

      <div className="fr-grid-row fr-grid-row--gutters fr-mb-6w">
        <div className="fr-col-12 fr-col-lg-6">
          <Panel title="Témoignages par région">
            <DsfrChart
              tag="map-chart"
              label="carte des témoignages par région"
              attributes={{
                data: JSON.stringify(
                  Object.fromEntries(
                    regions.map((r) => [r.code, r.testimonies]),
                  ),
                ),
                value: String(totalTestimonies),
                name: "Témoignages recensés",
                level: "reg",
                "selected-palette": "sequentialAscending",
              }}
            />
          </Panel>
        </div>
        <div className="fr-col-12 fr-col-lg-6">
          <Panel title="Revendications les plus citées">
            <DsfrChart
              tag="bar-chart"
              label="revendications les plus citées"
              aspectRatio={1.6}
              attributes={{
                x: JSON.stringify([demands.themes]),
                y: JSON.stringify([demands.mentions]),
                name: JSON.stringify(["Mentions"]),
                horizontal: "true",
                "unit-tooltip": "mentions",
              }}
            />
          </Panel>
        </div>
      </div>

      <div className="fr-grid-row fr-grid-row--gutters fr-mb-6w">
        <div className="fr-col-12 fr-col-lg-7">
          <Panel title="Dépôts de témoignages par semaine">
            <DsfrChart
              tag="line-chart"
              label="dépôts de témoignages par semaine"
              aspectRatio={1.8}
              attributes={{
                x: JSON.stringify([depositsPerWeek.weeks]),
                y: JSON.stringify([depositsPerWeek.testimonies]),
                name: JSON.stringify(["Témoignages déposés"]),
                "unit-tooltip": "témoignages",
              }}
            />
          </Panel>
        </div>
        <div className="fr-col-12 fr-col-lg-5">
          <Panel title="Communes participantes par taille">
            <DsfrChart
              tag="pie-chart"
              label="communes participantes par taille"
              aspectRatio={1.3}
              attributes={{
                x: JSON.stringify([municipalitySizes.brackets]),
                y: JSON.stringify([municipalitySizes.share]),
                name: JSON.stringify(municipalitySizes.brackets),
                "unit-tooltip": "%",
                "selected-palette": "categorical",
              }}
            />
          </Panel>
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
        data={regionsByTestimonies.map((r) => [
          r.name,
          numberFormat.format(r.participatingMunicipalities),
          numberFormat.format(r.testimonies),
          r.mainTheme,
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
