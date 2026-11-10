"use client";

import { createElement, useEffect, useRef, useState } from "react";
import "@gouvfr/dsfr-chart/css";

type ChartTag = "bar-chart" | "line-chart" | "pie-chart" | "map-chart";

interface Props {
  tag: ChartTag;
  /** Attributs du web component, en kebab-case, déjà sérialisés. */
  attributes: Record<string, string>;
  /** Ratio largeur/hauteur. Absent pour la carte, qui a sa propre taille. */
  aspectRatio?: number;
  /** Texte annoncé pendant le chargement de la librairie. */
  label: string;
}

// Les web components touchent `window` et `customElements` à l'import :
// on ne les charge que côté client, une seule fois.
let lib: Promise<unknown> | undefined;
function loadLib(): Promise<unknown> {
  return (lib ??= import("@gouvfr/dsfr-chart"));
}

// dsfr-chart construit parfois son canvas hors de la page (au montage, et le
// camembert à chaque redimensionnement) : Chart.js retombe alors sur une taille
// par défaut minuscule. Le composant se reconstruit quand `aspect-ratio`
// change, et cette fois-ci une fois attaché. Dès que le canvas ne prend pas
// toute la largeur, on alterne donc entre deux valeurs visuellement identiques.
const NUDGE = 0.0001;

function keepFullWidth(
  element: HTMLDivElement,
  chart: Element,
  aspectRatio: number,
): () => void {
  let nudged = false;
  function fit(): void {
    const canvas = chart.querySelector("canvas");
    if (!canvas) return;
    const missing = element.clientWidth - canvas.getBoundingClientRect().width;
    if (missing < 1) return;
    nudged = !nudged;
    chart.setAttribute(
      "aspect-ratio",
      String(aspectRatio + (nudged ? NUDGE : 0)),
    );
  }

  let timeout: ReturnType<typeof setTimeout>;
  function fitSoon(): void {
    clearTimeout(timeout);
    timeout = setTimeout(fit, 100);
  }

  const mutations = new MutationObserver(fitSoon);
  mutations.observe(chart, { childList: true, subtree: true });
  const resizes = new ResizeObserver(fitSoon);
  resizes.observe(element);
  fitSoon();

  return () => {
    mutations.disconnect();
    resizes.disconnect();
    clearTimeout(timeout);
  };
}

export function DsfrChart({ tag, attributes, aspectRatio, label }: Props) {
  const [ready, setReady] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void loadLib().then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const element = container.current;
    const chart = element?.firstElementChild;
    if (!ready || aspectRatio === undefined || !element || !chart) return;

    return keepFullWidth(element, chart, aspectRatio);
  }, [ready, aspectRatio]);

  if (!ready) {
    return (
      <div
        role="status"
        className="h-[300px] bg-[var(--background-alt-grey)] motion-safe:animate-pulse"
      >
        <span className="fr-sr-only">Chargement : {label}</span>
      </div>
    );
  }

  return (
    <div ref={container}>
      {createElement(tag, {
        ...attributes,
        ...(aspectRatio !== undefined && {
          "aspect-ratio": String(aspectRatio),
        }),
      })}
    </div>
  );
}
