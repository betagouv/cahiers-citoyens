import type { Metadata } from "next";
import { PlaceholderPage } from "@/app/_components/placeholder-page";

export const metadata: Metadata = { title: "Données personnelles" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Données personnelles"
      sections={[
        {
          title: "Données des cahiers",
          body: "Les informations permettant d'identifier une personne dans les cahiers sont masquées avant publication.",
        },
        {
          title: "Données de navigation",
          body: "Les traitements liés à la navigation sur le site seront décrits ici.",
        },
        {
          title: "Vos droits",
          body: "Les modalités d'exercice de vos droits seront précisées ici.",
        },
      ]}
    />
  );
}
