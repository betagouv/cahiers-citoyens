import type { Municipality } from "./domain";
import { withPreposition } from "./municipalities";
import type { Random } from "./random";

export function fillTemplate(
  fragment: string,
  municipality: Municipality,
  random: Random,
): string {
  // Pas de `\b` : il ne voit pas de frontière de mot devant « à ».
  const withPrepositions = fragment.replace(
    /(?<!\p{L})([Dd]e|[àÀ]) \{municipality\}/gu,
    (_, prep: string) => {
      const group = withPreposition(
        prep.toLowerCase() === "de" ? "de" : "à",
        municipality.name,
      );
      return prep === prep.toLowerCase()
        ? group
        : group[0].toUpperCase() + group.slice(1);
    },
  );
  return withPrepositions.replace(/\{(\w+)\}/g, (_, key: string) => {
    switch (key) {
      case "municipality":
        return municipality.name;
      case "km":
        return String(random.int(8, 70));
      case "euros":
        return String(random.int(3, 90) * 10);
      case "years":
        return String(random.int(3, 35));
      case "months":
        return String(random.int(2, 14));
      default:
        throw new Error(`gabarit inconnu : {${key}} dans « ${fragment} »`);
    }
  });
}
