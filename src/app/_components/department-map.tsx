"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fr } from "@codegouvfr/react-dsfr";
import { useIsDark } from "@codegouvfr/react-dsfr/useIsDark";
import type { LngLatBoundsLike, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  DEPARTMENTS_FILL_LAYER,
  DEPARTMENTS_SOURCE_LAYER,
  type DepartmentsSource,
  departmentMapStyle,
  departmentsSource,
  mapPalette,
  statusFeatureStates,
} from "@/lib/department-map-style";
import { type OnlineDepartment, departmentTooltip } from "@/lib/departments";
import { areaHrefByCode, publishedAreas } from "@/lib/published-areas";

const METROPOLE: LngLatBoundsLike = [
  [-5.2, 41.3],
  [9.6, 51.1],
];

const OVERSEAS: readonly { name: string; bounds: LngLatBoundsLike }[] = [
  { name: "Guadeloupe", bounds: [-61.85, 15.83, -61.0, 16.52] },
  { name: "Martinique", bounds: [-61.25, 14.38, -60.8, 14.89] },
  { name: "Guyane", bounds: [-54.6, 2.1, -51.6, 5.8] },
  { name: "La Réunion", bounds: [55.2, -21.4, 55.85, -20.85] },
  { name: "Mayotte", bounds: [44.98, -13.0, 45.32, -12.63] },
];

const FIT_PADDING = 4;

// MapLibre cherche son worker à côté de son propre module, qu'il ne retrouve
// pas une fois regroupé par Turbopack : on lui donne l'URL du fichier publié.
const MAPLIBRE_WORKER_URL = new URL(
  "maplibre-gl/dist/maplibre-gl-worker.mjs",
  import.meta.url,
).href;

interface Tooltip {
  x: number;
  y: number;
  text: string;
}

interface LoadedMap {
  map: MapLibreMap;
  source: DepartmentsSource;
}

// Ce que la carte sait des départements en ligne, indexé par code.
interface OnlineIndex {
  departments: readonly OnlineDepartment[];
  byCode: ReadonlyMap<string, OnlineDepartment>;
  hrefByCode: ReadonlyMap<string, string>;
}

function onlineIndex(departments: readonly OnlineDepartment[]): OnlineIndex {
  return {
    departments,
    byCode: new Map(
      departments.map((department) => [department.code, department]),
    ),
    hrefByCode: areaHrefByCode(publishedAreas(departments)),
  };
}

interface MapCallbacks {
  online: OnlineIndex;
  isDark: () => boolean;
  onLoad: (loaded: LoadedMap) => void;
  onTooltip: (tooltip: Tooltip | null) => void;
  onNavigate: (href: string) => void;
}

function styleFor(source: DepartmentsSource, isDark: boolean) {
  return departmentMapStyle(
    source,
    mapPalette(fr.colors.getHex({ isDark }).decisions),
  );
}

function stringProperty(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function bindHover(
  map: MapLibreMap,
  source: DepartmentsSource,
  callbacks: MapCallbacks,
) {
  function feature(code: string) {
    return {
      source: source.id,
      sourceLayer: DEPARTMENTS_SOURCE_LAYER,
      id: code,
    };
  }
  let hovered: string | undefined;
  function setHovered(code: string | undefined) {
    if (hovered !== undefined)
      map.setFeatureState(feature(hovered), { hover: false });
    hovered = code;
    if (code !== undefined) map.setFeatureState(feature(code), { hover: true });
  }
  map.on("mousemove", DEPARTMENTS_FILL_LAYER, (event) => {
    const properties = event.features?.[0]?.properties;
    const code = stringProperty(properties?.code);
    const name = stringProperty(properties?.nom);
    if (code === undefined || name === undefined) return;
    setHovered(code);
    const online = callbacks.online.byCode.get(code);
    map.getCanvas().style.cursor = online === undefined ? "" : "pointer";
    callbacks.onTooltip({
      x: event.point.x,
      y: event.point.y,
      text: departmentTooltip(name, code, online),
    });
  });
  map.on("mouseleave", DEPARTMENTS_FILL_LAYER, () => {
    setHovered(undefined);
    map.getCanvas().style.cursor = "";
    callbacks.onTooltip(null);
  });
  map.on("load", () => {
    for (const { code, status } of statusFeatureStates(
      callbacks.online.departments,
    ))
      map.setFeatureState(feature(code), { status });
  });
}

function bindEvents(
  map: MapLibreMap,
  source: DepartmentsSource,
  bounds: LngLatBoundsLike,
  callbacks: MapCallbacks,
) {
  bindHover(map, source, callbacks);
  const createdDark = callbacks.isDark();
  map.on("load", () => {
    callbacks.onLoad({ map, source });
    if (callbacks.isDark() !== createdDark)
      map.setStyle(styleFor(source, callbacks.isDark()));
  });
  map.on("resize", () => {
    map.fitBounds(bounds, { padding: FIT_PADDING, animate: false });
  });
  map.on("click", DEPARTMENTS_FILL_LAYER, (event) => {
    const code = stringProperty(event.features?.[0]?.properties?.code);
    const href =
      code === undefined ? undefined : callbacks.online.hrefByCode.get(code);
    if (href !== undefined) callbacks.onNavigate(href);
  });
}

// MapLibre touche `window` dès l'import : chargé ici, il ne s'évalue jamais
// côté serveur. Carte facile l'importe aussi.
async function createMap(
  container: HTMLElement,
  bounds: LngLatBoundsLike,
  callbacks: MapCallbacks,
): Promise<MapLibreMap> {
  const [maplibre, { mapOverlays }] = await Promise.all([
    import("maplibre-gl"),
    import("carte-facile"),
  ]);
  maplibre.setWorkerUrl(MAPLIBRE_WORKER_URL);
  const source = departmentsSource(
    mapOverlays.administrativeBoundaries.neutral,
  );
  const map = new maplibre.Map({
    container,
    style: styleFor(source, callbacks.isDark()),
    bounds,
    fitBoundsOptions: { padding: FIT_PADDING },
    interactive: false,
    attributionControl: false,
    renderWorldCopies: false,
  });
  bindEvents(map, source, bounds, callbacks);
  return map;
}

function useDepartmentMap(
  container: HTMLDivElement | null,
  bounds: LngLatBoundsLike,
  online: OnlineIndex,
  onTooltip: (tooltip: Tooltip | null) => void,
) {
  const router = useRouter();
  const { isDark } = useIsDark();
  const isDarkRef = useRef(isDark);
  const loadedRef = useRef<LoadedMap | null>(null);

  useEffect(() => {
    isDarkRef.current = isDark;
    const loaded = loadedRef.current;
    if (loaded !== null) loaded.map.setStyle(styleFor(loaded.source, isDark));
  }, [isDark]);

  useEffect(() => {
    if (container === null) return;
    const created = createMap(container, bounds, {
      online,
      isDark: () => isDarkRef.current,
      onLoad: (loaded) => {
        loadedRef.current = loaded;
      },
      onTooltip,
      onNavigate: (href) => router.push(href),
    });
    return () => {
      loadedRef.current = null;
      void created.then((map) => map.remove());
    };
  }, [bounds, container, online, onTooltip, router]);
}

interface MapFrameProps {
  bounds: LngLatBoundsLike;
  online: OnlineIndex;
}

function MapFrame({ bounds, online }: MapFrameProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  useDepartmentMap(container, bounds, online, setTooltip);

  return (
    <div className="relative h-full w-full">
      <div ref={setContainer} className="h-full w-full" />
      {tooltip !== null && (
        <p
          className={fr.cx("fr-text--xs", "fr-m-0", "fr-px-1w", "fr-py-1v")}
          style={{
            position: "absolute",
            left: tooltip.x + 12,
            top: tooltip.y + 12,
            zIndex: 10,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            background: fr.colors.decisions.background.default.grey.default,
            boxShadow: "var(--raised-shadow)",
          }}
        >
          {tooltip.text}
        </p>
      )}
    </div>
  );
}

// Carte à la souris seulement : clavier et lecteurs d'écran passent par la
// liste d'étiquettes voisine, qui mène aux mêmes pages.
export function DepartmentMap({
  departments,
}: {
  departments: readonly OnlineDepartment[];
}) {
  const online = useMemo(() => onlineIndex(departments), [departments]);
  return (
    <div
      aria-hidden="true"
      className="grid h-[18rem] grid-cols-[3.5rem_1fr] gap-2 md:h-[26rem]"
    >
      <div className="grid grid-rows-5 gap-1">
        {OVERSEAS.map(({ name, bounds }) => (
          <MapFrame key={name} bounds={bounds} online={online} />
        ))}
      </div>
      <MapFrame bounds={METROPOLE} online={online} />
    </div>
  );
}
