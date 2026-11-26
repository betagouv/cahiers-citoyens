import { Suspense } from "react";
import { SearchForm } from "@/app/_components/search-form";
import { parsePageSearch } from "@/lib/page-search/search-params";
import { parseQuestion, searchNotebooks } from "@/lib/search/search";
import { EmptyQuestion } from "./empty-question";
import { Outcome } from "./outcome";
import { PageSearchSection } from "./page-search-section";

async function Results({ question }: { question: string }) {
  const outcome = await searchNotebooks(question);
  return <Outcome question={question} outcome={outcome} />;
}

export async function SearchSection({
  searchParams,
}: Pick<PageProps<"/search">, "searchParams">) {
  const params = await searchParams;
  const pageSearch = parsePageSearch(params);
  if (pageSearch !== undefined)
    return <PageSearchSection search={pageSearch} />;
  const question = parseQuestion(params.q);
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
