import type { Metadata } from "next";
import { PlaceholderPage } from "@/app/_components/placeholder-page";

export const metadata: Metadata = { title: "Publication des cahiers" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Publication des cahiers"
      sections={[
        {
          title: "Les territoires en ligne",
          body: "Les cahiers sont publiés département par département, à mesure que leur transcription est relue.",
        },
        {
          title: "Comment la publication avance",
          body: "Chaque lot passe par la numérisation, la transcription, la vérification des données personnelles, puis la mise en ligne.",
        },
        {
          title: "État par département",
          body: "Un tableau de l'état de publication de chaque département figurera ici.",
        },
      ]}
    />
  );
}
