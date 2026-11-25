import { Suspense } from "react";
import { HomeSearchForm } from "@/app/_components/home-search-form";
import { formatPlaceCodes } from "@/lib/page-search/place-codes";
import type { PageSearch } from "@/lib/page-search/search-params";
import { PageResults } from "./page-results";
import { resolvePlaceForRequest } from "./resolve-place";

// Recherche par lieu et mot-clé : le formulaire prérempli, puis les pages.
export async function PageSearchSection({ search }: { search: PageSearch }) {
  const resolution = await resolvePlaceForRequest(search.place);
  const place = resolution.status === "found" ? resolution.place : undefined;
  return (
    <>
      <div className="fr-p-4w bg-[var(--background-alt-grey)]">
        <HomeSearchForm
          id="search-pages"
          initialPlace={
            place === undefined
              ? null
              : {
                  code: formatPlaceCodes(place.codes),
                  label: place.label,
                  pageCount: place.pageCount,
                }
          }
          initialPlaceText={search.place}
          initialKeyword={search.keyword}
        />
      </div>
      {resolution.status === "unknown" && (
        <p className="fr-mt-4w">
          Aucun lieu ne correspond à « {resolution.input} ». Vérifiez son
          orthographe, ou saisissez son code postal ou son département.
        </p>
      )}
      {resolution.status === "none" && search.keyword === "" && (
        <p className="fr-mt-4w">
          Saisissez un lieu, un mot-clé, ou les deux, pour voir les pages des
          cahiers qui y correspondent.
        </p>
      )}
      {place !== undefined ||
      (resolution.status === "none" && search.keyword !== "") ? (
        <Suspense
          key={`${search.place}|${search.keyword}|${search.pageIndex}`}
          fallback={
            <p role="status" className="fr-mt-4w">
              Recherche des pages…
            </p>
          }
        >
          <PageResults
            place={place}
            keyword={search.keyword}
            pageIndex={search.pageIndex}
          />
        </Suspense>
      ) : null}
    </>
  );
}
