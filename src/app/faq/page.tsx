import type { Metadata } from "next";
import { PlaceholderPage } from "@/app/_components/placeholder-page";

export const metadata: Metadata = { title: "Questions fréquentes" };

export default function Page() {
  return (
    <PlaceholderPage
      title="Questions fréquentes"
      sections={[
        {
          title: "Comment les cahiers sont-ils transcrits ?",
          body: "Les pages numérisées sont transcrites automatiquement, puis relues. Des erreurs de lecture peuvent subsister.",
        },
        {
          title: "Les données personnelles sont-elles protégées ?",
          body: "Les noms, adresses et autres informations permettant d'identifier une personne sont masqués avant publication.",
        },
        {
          title: "Puis-je réutiliser les textes ?",
          body: "Les contenus du site sont proposés sous licence etalab-2.0, sauf mention contraire.",
        },
      ]}
    />
  );
}
