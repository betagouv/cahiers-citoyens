import type { Metadata } from "next";
import { PlaceholderPage } from "@/app/_components/placeholder-page";

export const metadata: Metadata = { title: "Comprendre les cahiers" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Comprendre les cahiers"
      sections={[
        {
          title: "D'où viennent les cahiers",
          body: "Pendant le Grand Débat national, des mairies ont ouvert des cahiers où chacun pouvait écrire librement. Ils ont ensuite été rassemblés, numérisés et transcrits.",
        },
        {
          title: "Ce qu'ils contiennent",
          body: "Des propositions, des témoignages, des colères et des questions, écrits à la main ou collés sur les pages, signés ou non.",
        },
        {
          title: "Ce qu'ils ne disent pas",
          body: "Les cahiers ne forment pas un échantillon représentatif : ils reflètent la parole de celles et ceux qui ont choisi d'écrire, là où un cahier était ouvert.",
        },
      ]}
    />
  );
}
