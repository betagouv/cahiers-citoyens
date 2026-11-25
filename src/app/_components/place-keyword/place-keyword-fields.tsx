"use client";

import { useState } from "react";
import { isKnownWord } from "@/lib/page-search/known-word";
import type { SelectedPlace } from "@/lib/page-search/place-label";
import { KeywordField } from "./keyword-field";
import { PlaceField } from "./place-field";
import { SubmitButton } from "./submit-button";
import { usePageCount } from "./use-page-count";
import { useWordSuggestions } from "./use-word-suggestions";

interface PlaceKeywordFieldsProps {
  id: string;
  initialPlace: SelectedPlace | null;
  // Texte du champ « Lieu » quand aucun lieu n'a été reconnu.
  initialPlaceText: string;
  initialKeyword: string;
}

// Les deux champs et le bouton, qui annonce le nombre de pages à voir : celles
// du mot-clé quand c'est un mot entier des pages, sinon celles du lieu.
export function PlaceKeywordFields({
  id,
  initialPlace,
  initialPlaceText,
  initialKeyword,
}: PlaceKeywordFieldsProps) {
  const [place, setPlace] = useState(initialPlace);
  const [placeText, setPlaceText] = useState(
    initialPlace?.label ?? initialPlaceText,
  );
  const [keyword, setKeyword] = useState(initialKeyword);
  const [chosenWord, setChosenWord] = useState<string | null>(null);
  const words = useWordSuggestions(keyword, place?.code);
  const knownWord = isKnownWord(
    keyword,
    chosenWord,
    words.loading ? undefined : words.data,
  );
  const count = usePageCount(place, placeText, knownWord ? keyword : "");
  return (
    <>
      <div className="md:flex-1">
        <PlaceField
          id={`${id}-place`}
          text={placeText}
          selection={place}
          onTextChange={(text) => {
            setPlaceText(text);
            setPlace(null);
          }}
          onSelect={(selected) => {
            setPlace(selected);
            setPlaceText(selected.label);
          }}
        />
      </div>
      <div className="md:flex-1">
        <KeywordField
          id={`${id}-keyword`}
          value={keyword}
          suggestions={words}
          onChange={setKeyword}
          onChoose={(word) => {
            setKeyword(word);
            setChosenWord(word);
          }}
        />
      </div>
      <SubmitButton count={count} />
    </>
  );
}
