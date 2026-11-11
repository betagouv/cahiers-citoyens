import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Alert } from "@codegouvfr/react-dsfr/Alert";
import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";
import { Card } from "@codegouvfr/react-dsfr/Card";
import { SearchForm } from "@/app/_components/search-form";
import { excerpt } from "@/lib/format";
import { splitCitations } from "@/lib/search/citations";
import {
  type SearchOutcome,
  type Source,
  parseQuestion,
  searchNotebooks,
} from "@/lib/search/search";

export const metadata: Metadata = { title: "Rechercher" };

const EXAMPLE_QUESTIONS = [
  "Il n'y a plus de médecin au village",
  "Que disent les habitants du prix du carburant ?",
  "Quelles propositions pour le référendum d'initiative citoyenne ?",
];

function Answer({ text, sourceCount }: { text: string; sourceCount: number }) {
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

function Sources({ sources }: { sources: Source[] }) {
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

function Outcome({
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
          <section
            aria-labelledby="answer-title"
            className="border-l-4 border-[var(--border-plain-blue-france)] bg-[var(--background-alt-blue-france)] fr-p-3w"
          >
            <h2 id="answer-title" className="fr-h4">
              Réponse
            </h2>
            <Answer
              text={outcome.answer}
              sourceCount={outcome.sources.length}
            />
            <p className="fr-text--sm fr-mb-0 text-[var(--text-mention-grey)]">
              Réponse rédigée automatiquement par le modèle {outcome.chatModel}{" "}
              (API Albert), à partir des seuls passages ci-dessous. Vérifiez-la
              dans les sources.
            </p>
          </section>
          <Sources sources={outcome.sources} />
        </>
      );
  }
}

async function Results({ question }: { question: string }) {
  const outcome = await searchNotebooks(question);
  return <Outcome question={question} outcome={outcome} />;
}

function EmptyQuestion() {
  return (
    <div className="fr-mt-4w">
      <p>
        Posez une question en langage courant : la recherche trouve les passages
        des cahiers qui en parlent, même sans les mêmes mots, puis en rédige une
        synthèse sourcée.
      </p>
      <p className="fr-mb-1w">Par exemple :</p>
      <ul>
        {EXAMPLE_QUESTIONS.map((example) => (
          <li key={example}>
            <Link href={`/search?q=${encodeURIComponent(example)}`}>
              {example}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function SearchSection({
  searchParams,
}: Pick<PageProps<"/search">, "searchParams">) {
  const question = parseQuestion((await searchParams).q);
  return (
    <>
      <SearchForm id="search-page" defaultValue={question} big />
      {question === "" ? (
        <EmptyQuestion />
      ) : (
        <div className="fr-mt-4w">
          <Suspense
            key={question}
            fallback={
              <p role="status">
                Recherche des passages et rédaction de la réponse…
              </p>
            }
          >
            <Results question={question} />
          </Suspense>
        </div>
      )}
    </>
  );
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="fr-container fr-py-6w">
      <Breadcrumb
        currentPageLabel="Rechercher"
        homeLinkProps={{ href: "/" }}
        segments={[]}
      />
      <h1>Rechercher dans les cahiers</h1>
      <Suspense fallback={<SearchForm id="search-page" big />}>
        <SearchSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
