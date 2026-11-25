"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  PUBLICATION_STATUS_LABELS,
  areaHref,
  publicationStatus,
  publishedAreaOf,
} from "@/lib/departments";

const METROPOLE: LngLatBoundsLike = [
  [-5.2, 41.3],
  [9.6, 51.1],
];

const OVERSEAS: readonly { name: string; bounds: LngLatBoundsLike }[] = [
  {
    name: "Guadeloupe",
    bounds: [
      [-61.85, 15.83],
      [-61.0, 16.52],
    ],
  },
  {
    name: "Martinique",
    bounds: [
      [-61.25, 14.38],
      [-60.8, 14.89],
    ],
  },
  {
    name: "Guyane",
    bounds: [
      [-54.6, 2.1],
      [-51.6, 5.8],
    ],
  },
  {
    name: "La Réunion",
    bounds: [
      [55.2, -21.4],
      [55.85, -20.85],
    ],
  },
  {
    name: "Mayotte",
    bounds: [
      [44.98, -13.0],
      [45.32, -12.63],
    ],
  },
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

function paletteFor(isDark: boolean) {
  return mapPalette(fr.colors.getHex({ isDark }).decisions);
}

function MapFrame({ bounds }: { bounds: LngLatBoundsLike }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef<{ map: MapLibreMap; source: DepartmentsSource }>(
    null,
  );
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const router = useRouter();
  const { isDark } = useIsDark();
  const isDarkRef = useRef(isDark);

  useEffect(() => {
    isDarkRef.current = isDark;
    const loaded = loadedRef.current;
    if (loaded !== null)
      loaded.map.setStyle(
        departmentMapStyle(loaded.source, paletteFor(isDark)),
      );
  }, [isDark]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    let map: MapLibreMap | undefined;
    let cancelled = false;

    // MapLibre touche `window` dès l'import : chargé ici, il ne s'évalue
    // jamais côté serveur. Carte facile l'importe aussi.
    void Promise.all([import("maplibre-gl"), import("carte-facile")]).then(
      ([maplibre, { mapOverlays }]) => {
        if (cancelled) return;
        maplibre.setWorkerUrl(MAPLIBRE_WORKER_URL);
        const source = departmentsSource(
          mapOverlays.administrativeBoundaries.neutral,
        );
        const instance = new maplibre.Map({
          container,
          style: departmentMapStyle(source, paletteFor(isDarkRef.current)),
          bounds,
          fitBoundsOptions: { padding: FIT_PADDING },
          interactive: false,
          attributionControl: false,
          renderWorldCopies: false,
        });
        map = instance;

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
            instance.setFeatureState(feature(hovered), { hover: false });
          hovered = code;
          if (code !== undefined)
            instance.setFeatureState(feature(code), { hover: true });
        }

        const createdDark = isDarkRef.current;
        instance.on("load", () => {
          for (const { code, status } of statusFeatureStates())
            instance.setFeatureState(feature(code), { status });
          loadedRef.current = { map: instance, source };
          if (isDarkRef.current !== createdDark)
            instance.setStyle(
              departmentMapStyle(source, paletteFor(isDarkRef.current)),
            );
        });
        instance.on("resize", () => {
          instance.fitBounds(bounds, { padding: FIT_PADDING, animate: false });
        });
        instance.on("mousemove", DEPARTMENTS_FILL_LAYER, (event) => {
          const properties = event.features?.[0]?.properties;
          const code: unknown = properties?.code;
          const name: unknown = properties?.nom;
          if (typeof code !== "string" || typeof name !== "string") return;
          setHovered(code);
          const status = publicationStatus(code);
          instance.getCanvas().style.cursor =
            status === "online" ? "pointer" : "";
          setTooltip({
            x: event.point.x,
            y: event.point.y,
            text: `${name} (${code}) · ${PUBLICATION_STATUS_LABELS[status]}`,
          });
        });
        instance.on("mouseleave", DEPARTMENTS_FILL_LAYER, () => {
          setHovered(undefined);
          instance.getCanvas().style.cursor = "";
          setTooltip(null);
        });
        instance.on("click", DEPARTMENTS_FILL_LAYER, (event) => {
          const code: unknown = event.features?.[0]?.properties?.code;
          const area =
            typeof code === "string" ? publishedAreaOf(code) : undefined;
          if (area !== undefined) router.push(areaHref(area));
        });
      },
    );

    return () => {
      cancelled = true;
      loadedRef.current = null;
      map?.remove();
    };
  }, [bounds, router]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
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
export function DepartmentMap() {
  return (
    <div
      aria-hidden="true"
      className="grid h-[18rem] grid-cols-[3.5rem_1fr] gap-2 md:h-[26rem]"
    >
      <div className="grid grid-rows-5 gap-1">
        {OVERSEAS.map(({ name, bounds }) => (
          <MapFrame key={name} bounds={bounds} />
        ))}
      </div>
      <MapFrame bounds={METROPOLE} />
    </div>
  );
}
