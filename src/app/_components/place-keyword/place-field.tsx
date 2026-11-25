"use client";

import { fr } from "@codegouvfr/react-dsfr";
import { toSearchName } from "@/geography/search-name";
import { MIN_PLACE_INPUT_LENGTH } from "@/lib/page-search/place-input";
import {
  type PlaceSuggestion,
  type SelectedPlace,
  placeDescription,
  placeLabel,
  selectedPlace,
} from "@/lib/page-search/place-label";
import { parsePlaceSuggestions } from "@/lib/page-search/responses";
import { pageCountLabel } from "@/lib/page-search/word-suggestion";
import { Combobox } from "./combobox";
import { HelpBox } from "./help-box";
import { HighlightedPrefix } from "./highlighted-prefix";
import { useDebouncedJson } from "./use-debounced-json";
import { useHydrated } from "./use-hydrated";

interface PlaceFieldProps {
  id: string;
  text: string;
  selection: SelectedPlace | null;
  onTextChange: (text: string) => void;
  onSelect: (place: SelectedPlace) => void;
}

function PlaceOption({
  place,
  typed,
}: {
  place: PlaceSuggestion;
  typed: string;
}) {
  const title = place.kind === "department" ? placeLabel(place) : place.name;
  return (
    <>
      <span className="flex flex-col">
        <span>
          <HighlightedPrefix
            text={title}
            typed={typed}
            normalize={toSearchName}
          />
        </span>
        <span
          className={`${fr.cx("fr-text--xs", "fr-mb-0")} text-[var(--text-mention-grey)]`}
        >
          {placeDescription(place)}
        </span>
      </span>
      {place.pageCount > 0 ? (
        <span
          className={`${fr.cx("fr-text--xs", "fr-mb-0")} whitespace-nowrap font-bold`}
        >
          {pageCountLabel(place.pageCount)}
        </span>
      ) : (
        <span
          className={`${fr.cx("fr-text--xs", "fr-mb-0")} whitespace-nowrap text-[var(--text-mention-grey)]`}
        >
          À venir
        </span>
      )}
    </>
  );
}

// Champ « Lieu ». Sans JavaScript, le texte saisi part tel quel dans
// `?place=` et la page de résultats le reconnaît. Avec, le lieu choisi part
// par son code, dans un champ caché.
export function PlaceField({
  id,
  text,
  selection,
  onTextChange,
  onSelect,
}: PlaceFieldProps) {
  const hydrated = useHydrated();
  const typed = selection === null ? text.trim() : "";
  const url =
    toSearchName(typed).length >= MIN_PLACE_INPUT_LENGTH
      ? `/api/suggestions/places?q=${encodeURIComponent(typed)}`
      : null;
  const { data, loading } = useDebouncedJson(url, parsePlaceSuggestions);
  const sendsCode = hydrated && selection !== null;
  return (
    <>
      <Combobox
        id={id}
        label="Lieu"
        hint="Commune, code postal ou département"
        name={sendsCode ? undefined : "place"}
        value={text}
        onValueChange={onTextChange}
        options={url === null ? [] : (data ?? [])}
        optionKey={(place) => `${place.kind}-${place.code}`}
        renderOption={(place) => <PlaceOption place={place} typed={typed} />}
        onSelect={(place) => onSelect(selectedPlace(place))}
        clearLabel="Effacer le lieu"
        emptyText={
          !loading && data?.length === 0
            ? "Aucun lieu ne correspond à cette saisie."
            : undefined
        }
        footer={
          <HelpBox
            title="Votre commune n’apparaît pas ?"
            text="Les cahiers sont publiés progressivement. Certaines communes n’en ont pas dans le fonds numérisé."
            linkLabel="Comprendre pourquoi"
            href="/publication"
          />
        }
        maxLength={100}
      />
      {sendsCode && <input type="hidden" name="place" value={selection.code} />}
    </>
  );
}
