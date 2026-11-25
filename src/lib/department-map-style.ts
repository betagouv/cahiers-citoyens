import type { fr } from "@codegouvfr/react-dsfr";
import type { OverlayConfig } from "carte-facile";
import type {
  DataDrivenPropertyValueSpecification,
  StyleSpecification,
} from "maplibre-gl";
import {
  ABSENT_DEPARTMENT_CODES,
  PUBLISHED_AREAS,
} from "./department-registry";
import type { PublicationStatus } from "./departments";

type ColorDecisions =
  typeof fr.colors.decisions | ReturnType<typeof fr.colors.getHex>["decisions"];

export interface MapPalette {
  status: Record<PublicationStatus, { fill: string; hover: string }>;
  border: string;
  background: string;
}

// Une seule table de couleurs : en variables CSS pour la légende, en hexadécimal
// pour MapLibre, qui ne lit pas les variables CSS.
export function mapPalette(decisions: ColorDecisions): MapPalette {
  const caramel = decisions.background.contrast.brownCaramel;
  const grey = decisions.background.contrast.grey;
  return {
    status: {
      online: {
        fill: caramel.active,
        hover: decisions.border.default.brownCaramel.default,
      },
      upcoming: { fill: caramel.default, hover: caramel.hover },
      absent: { fill: grey.hover, hover: grey.active },
    },
    border: decisions.background.default.grey.default,
    background: decisions.background.default.grey.default,
  };
}

export const DEPARTMENTS_SOURCE_LAYER = "departements";
export const DEPARTMENTS_FILL_LAYER = "departments-fill";
const DEPARTMENTS_LINE_LAYER = "departments-line";
const BACKGROUND_LAYER = "background";

export function statusFeatureStates(): {
  code: string;
  status: PublicationStatus;
}[] {
  return [
    ...PUBLISHED_AREAS.flatMap((area) =>
      area.codes.map((code) => ({ code, status: "online" as const })),
    ),
    ...ABSENT_DEPARTMENT_CODES.map((code) => ({
      code,
      status: "absent" as const,
    })),
  ];
}

// Le statut arrive par l'état des entités (`statusFeatureStates`) : le style
// reste fixe et le registre ne vit que dans `departments.ts`.
function fillColor(
  palette: MapPalette,
): DataDrivenPropertyValueSpecification<string> {
  function byStatus(shade: "fill" | "hover") {
    return [
      "match",
      ["feature-state", "status"],
      "online",
      palette.status.online[shade],
      "absent",
      palette.status.absent[shade],
      palette.status.upcoming[shade],
    ] satisfies DataDrivenPropertyValueSpecification<string>;
  }
  return [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    byStatus("hover"),
    byStatus("fill"),
  ];
}

export interface DepartmentsSource {
  id: string;
  spec: StyleSpecification["sources"][string];
}

// La source vectorielle des départements, prise dans la surcouche Carte facile
// plutôt que recopiée, et dont les entités prennent pour identifiant leur code.
export function departmentsSource(overlay: OverlayConfig): DepartmentsSource {
  const layer = overlay.layers.find(
    (candidate) =>
      "source-layer" in candidate &&
      candidate["source-layer"] === DEPARTMENTS_SOURCE_LAYER,
  );
  const id =
    layer !== undefined && "source" in layer ? layer.source : undefined;
  const spec = id === undefined ? undefined : overlay.sources[id];
  if (id === undefined || spec?.type !== "vector")
    throw new Error("Carte facile ne fournit plus la couche des départements");
  return {
    id,
    spec: { ...spec, promoteId: { [DEPARTMENTS_SOURCE_LAYER]: "code" } },
  };
}

export function departmentMapStyle(
  source: DepartmentsSource,
  palette: MapPalette,
): StyleSpecification {
  return {
    version: 8,
    sources: { [source.id]: source.spec },
    layers: [
      {
        id: BACKGROUND_LAYER,
        type: "background",
        paint: { "background-color": palette.background },
      },
      {
        id: DEPARTMENTS_FILL_LAYER,
        type: "fill",
        source: source.id,
        "source-layer": DEPARTMENTS_SOURCE_LAYER,
        paint: { "fill-color": fillColor(palette) },
      },
      {
        id: DEPARTMENTS_LINE_LAYER,
        type: "line",
        source: source.id,
        "source-layer": DEPARTMENTS_SOURCE_LAYER,
        paint: { "line-color": palette.border, "line-width": 0.75 },
      },
    ],
  };
}
