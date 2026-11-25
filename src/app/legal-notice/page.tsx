import type { Metadata } from "next";
import { PlaceholderPage } from "@/app/_components/placeholder-page";

export const metadata: Metadata = { title: "Mentions légales" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Mentions légales"
      sections={[
        {
          title: "Éditeur",
          body: "Ce site est édité par la DITP et la DINUM, avec le Campus Condorcet.",
        },
        {
          title: "Hébergement",
          body: "Les informations sur l'hébergement du site seront précisées ici.",
        },
        {
          title: "Licence",
          body: "Sauf mention contraire, les contenus du site sont proposés sous licence etalab-2.0.",
        },
      ]}
    />
  );
}
