import type { ReactNode } from "react";
import { Notice } from "@codegouvfr/react-dsfr/Notice";

export interface PlaceholderSection {
  title: string;
  body: ReactNode;
}

interface PlaceholderPageProps {
  title: string;
  sections: readonly PlaceholderSection[];
}

export function PlaceholderPage({ title, sections }: PlaceholderPageProps) {
  return (
    <div className="fr-container fr-py-8w">
      <h1>{title}</h1>
      <Notice
        className="fr-mb-4w"
        title="Page provisoire"
        description="Ce contenu est fictif : il tient la place du texte définitif, en cours de rédaction."
      />
      {sections.map((section) => (
        <section key={section.title} className="fr-mb-4w">
          <h2 className="fr-h4">{section.title}</h2>
          <p>{section.body}</p>
        </section>
      ))}
    </div>
  );
}
