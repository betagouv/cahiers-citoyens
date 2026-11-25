"use client";

import { fr } from "@codegouvfr/react-dsfr";
import { foldAccents } from "@/lib/page-search/fold-accents";
import { MAX_KEYWORD_LENGTH } from "@/lib/page-search/keyword";
import { parseWordSuggestions } from "@/lib/page-search/responses";
import {
  MIN_WORD_PREFIX_LENGTH,
  pageCountLabel,
} from "@/lib/page-search/word-suggestion";
import { Combobox } from "./combobox";
import { HelpBox } from "./help-box";
import { HighlightedPrefix } from "./highlighted-prefix";
import { useDebouncedJson } from "./use-debounced-json";

interface KeywordFieldProps {
  id: string;
  value: string;
  // Code du lieu choisi : les mots proposés sont ceux de ses pages.
  placeCode: string | undefined;
  onChange: (value: string) => void;
}

function suggestionsUrl(typed: string, placeCode: string | undefined) {
  if (foldAccents(typed).length < MIN_WORD_PREFIX_LENGTH) return null;
  const params = new URLSearchParams({ q: typed });
  if (placeCode !== undefined) params.set("place", placeCode);
  return `/api/suggestions/words?${params}`;
}

// Champ « Mot-clé » : les mots proposés existent tels quels dans les pages
// publiées, avec le nombre de pages qui les contiennent.
export function KeywordField({
  id,
  value,
  placeCode,
  onChange,
}: KeywordFieldProps) {
  const typed = value.trim();
  const url = suggestionsUrl(typed, placeCode);
  const { data, loading } = useDebouncedJson(url, parseWordSuggestions);
  return (
    <Combobox
      id={id}
      label="Mot-clé"
      hint="Par exemple : retraite"
      name="q"
      value={value}
      onValueChange={onChange}
      options={url === null ? [] : (data ?? [])}
      optionKey={(suggestion) => suggestion.word}
      renderOption={(suggestion) => (
        <>
          <span>
            <HighlightedPrefix
              text={suggestion.word}
              typed={typed}
              normalize={foldAccents}
            />
          </span>
          <span
            className={`${fr.cx("fr-text--xs", "fr-mb-0")} whitespace-nowrap font-bold`}
          >
            {pageCountLabel(suggestion.pageCount)}
          </span>
        </>
      )}
      onSelect={(suggestion) => onChange(suggestion.word)}
      clearLabel="Effacer le mot-clé"
      emptyText={
        !loading && data?.length === 0
          ? "Aucun mot des cahiers publiés ne commence ainsi."
          : undefined
      }
      footer={
        <HelpBox
          title="Vous ne trouvez pas votre mot ?"
          text="Les suggestions reprennent les mots présents dans les cahiers publiés. Essayez une autre forme du mot ou un mot proche."
          linkLabel="Comprendre la recherche par mot-clé"
          href="/faq"
        />
      }
      maxLength={MAX_KEYWORD_LENGTH}
    />
  );
}
