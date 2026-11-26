import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumb } from "@codegouvfr/react-dsfr/Breadcrumb";
import { parsePageSearch } from "@/lib/page-search/search-params";
import { pageSearchMetadata } from "./_components/page-search-metadata";
import { SearchSection } from "./_components/search-section";

export async function generateMetadata({
  searchParams,
}: PageProps<"/search">): Promise<Metadata> {
  const pageSearch = parsePageSearch(await searchParams);
  return pageSearch === undefined
    ? { title: "Rechercher" }
    : pageSearchMetadata(pageSearch);
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
      {/* L'enveloppe statique ne sait pas encore quelle recherche afficher :
          elle ne montre aucun des deux formulaires, pour n'en faire clignoter
          aucun. */}
      <Suspense fallback={<p>Chargement de la recherche…</p>}>
        <SearchSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
