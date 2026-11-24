import { Suspense } from "react";
import { SearchForm } from "@/app/_components/search-form";
import { parseQuestion, searchNotebooks } from "@/lib/search/search";
import { EmptyQuestion } from "./empty-question";
import { Outcome } from "./outcome";

async function Results({ question }: { question: string }) {
  const outcome = await searchNotebooks(question);
  return <Outcome question={question} outcome={outcome} />;
}

export async function SearchSection({
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
