import { Alert } from "@codegouvfr/react-dsfr/Alert";
import type { SearchOutcome } from "@/lib/search/search";
import { Answer } from "./answer";
import { Sources } from "./sources";

export function Outcome({
  question,
  outcome,
}: {
  question: string;
  outcome: SearchOutcome;
}) {
  const notices = outcome.notices.map((notice) => (
    <Alert
      key={notice}
      severity="info"
      small
      description={notice}
      className="fr-mb-3w"
    />
  ));
  switch (outcome.status) {
    case "no-results":
      return (
        <>
          {notices}
          <p>
            Aucun passage des cahiers ne répond à « {question} ». Essayez
            d&apos;autres mots, ou une question plus courte.
          </p>
        </>
      );
    case "sources-only":
      return (
        <>
          {notices}
          <Alert severity="warning" small description={outcome.reason} />
          <Sources sources={outcome.sources} />
        </>
      );
    case "answered":
      return (
        <>
          {notices}
          <Answer
            text={outcome.answer}
            sourceCount={outcome.sources.length}
            chatModel={outcome.chatModel}
          />
          <Sources sources={outcome.sources} />
        </>
      );
  }
}
