import Form from "next/form";
import type { SelectedPlace } from "@/lib/page-search/place-label";
import { PlaceKeywordFields } from "./place-keyword/place-keyword-fields";

interface HomeSearchFormProps {
  id?: string;
  initialPlace?: SelectedPlace | null;
  initialPlaceText?: string;
  initialKeyword?: string;
}

// Un vrai formulaire GET vers `/search` : sans JavaScript, il envoie le lieu
// saisi et le mot-clé ; avec, il propose lieux et mots et compte les pages.
// `place` part toujours, même vide : c'est ce qui distingue cette recherche de
// la question posée par la barre de recherche (`?q=` seul).
export function HomeSearchForm({
  id = "place-keyword",
  initialPlace = null,
  initialPlaceText = "",
  initialKeyword = "",
}: HomeSearchFormProps) {
  return (
    <Form
      action="/search"
      role="search"
      aria-label="Rechercher par lieu et mot-clé"
      className="flex flex-col gap-4 md:flex-row md:items-end"
    >
      <PlaceKeywordFields
        id={id}
        initialPlace={initialPlace}
        initialPlaceText={initialPlaceText}
        initialKeyword={initialKeyword}
      />
    </Form>
  );
}
