import { splitCitations } from "@/lib/search/citations";

interface AnswerProps {
  text: string;
  sourceCount: number;
  chatModel: string;
}

function Paragraphs({ text, sourceCount }: Omit<AnswerProps, "chatModel">) {
  return text.split(/\n\s*\n/).map((paragraph, paragraphIndex) => (
    <p key={paragraphIndex}>
      {splitCitations(paragraph, sourceCount).map((segment, index) =>
        segment.kind === "text" ? (
          segment.text
        ) : (
          <a
            key={index}
            href={`#source-${segment.number}`}
            title={`Source ${segment.number}`}
            className="fr-link"
          >
            [{segment.number}]
          </a>
        ),
      )}
    </p>
  ));
}

// La réponse rédigée par le modèle, ses renvois `[n]` liés aux sources.
export function Answer({ text, sourceCount, chatModel }: AnswerProps) {
  return (
    <section
      aria-labelledby="answer-title"
      className="border-l-4 border-[var(--border-plain-blue-france)] bg-[var(--background-alt-blue-france)] fr-p-3w"
    >
      <h2 id="answer-title" className="fr-h4">
        Réponse
      </h2>
      <Paragraphs text={text} sourceCount={sourceCount} />
      <p className="fr-text--sm fr-mb-0 text-[var(--text-mention-grey)]">
        Réponse rédigée automatiquement par le modèle {chatModel} (API Albert),
        à partir des seuls passages ci-dessous. Vérifiez-la dans les sources.
      </p>
    </section>
  );
}
