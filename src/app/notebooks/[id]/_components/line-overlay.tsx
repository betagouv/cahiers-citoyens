// Calque posé sur l'image d'une page : chaque ligne qui contient le mot
// cherché, teintée comme au surligneur. Le repère est celui des pixels de
// l'image d'origine (`viewBox`), et le calque couvre l'image affichée : il en
// suit la taille à toute largeur. Décoratif, il est caché aux aides
// techniques ; la transcription porte les mêmes mots dans `mark`. La teinte
// est fixe, car le papier numérisé reste clair dans les deux thèmes.
export function LineOverlay({
  width,
  height,
  lines,
}: {
  width: number;
  height: number;
  lines: readonly string[];
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {lines.map((points, index) => (
        <polygon
          key={index}
          points={points}
          vectorEffect="non-scaling-stroke"
          className="fill-[var(--yellow-tournesol-main-731)] stroke-[var(--yellow-tournesol-main-731)] [fill-opacity:0.4] [mix-blend-mode:multiply] [stroke-width:2]"
        />
      ))}
    </svg>
  );
}
