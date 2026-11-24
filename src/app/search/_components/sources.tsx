import { Card } from "@codegouvfr/react-dsfr/Card";
import { excerpt } from "@/lib/format";
import type { Source } from "@/lib/search/search";

export function Sources({ sources }: { sources: Source[] }) {
  return (
    <section aria-labelledby="sources-title" className="fr-mt-6w">
      <h2 id="sources-title" className="fr-h4">
        Sources
      </h2>
      <div className="fr-grid-row fr-grid-row--gutters">
        {sources.map((source) => (
          <div
            key={source.id}
            id={`source-${source.number}`}
            className="fr-col-12"
          >
            <Card
              title={`[${source.number}] Cahier ${source.notebookId}`}
              titleAs="h3"
              desc={excerpt(source.content, 600)}
              linkProps={{ href: `/notebooks/${source.notebookId}` }}
              enlargeLink
              size="small"
              border
            />
          </div>
        ))}
      </div>
    </section>
  );
}
