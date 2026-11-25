import type { Metadata } from "next";
import { PlaceholderPage } from "@/app/_components/placeholder-page";

export const metadata: Metadata = { title: "Accessibilité" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Accessibilité"
      sections={[
        {
          title: "État de conformité",
          body: "Le site Cahiers citoyens n'est pas encore conforme au référentiel général d'amélioration de l'accessibilité (RGAA) : aucun audit n'a été réalisé.",
        },
        {
          title: "Signaler un défaut d'accessibilité",
          body: "Les modalités de contact seront précisées ici.",
        },
      ]}
    />
  );
}
