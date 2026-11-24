import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";
import { SearchForm } from "@/app/_components/search-form";
import { SearchSection } from "./_components/search-section";

export const metadata: Metadata = { title: "Rechercher" };

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
