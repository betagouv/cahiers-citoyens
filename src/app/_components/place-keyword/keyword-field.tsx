"use client";

import { fr } from "@codegouvfr/react-dsfr";
import { foldAccents } from "@/lib/page-search/fold-accents";
import { MAX_KEYWORD_LENGTH } from "@/lib/page-search/keyword";
import { pageCountLabel } from "@/lib/page-search/word-suggestion";
import { Combobox } from "./combobox";
import { HelpBox } from "./help-box";
import { HighlightedPrefix } from "./highlighted-prefix";
import type { WordSuggestions } from "./use-word-suggestions";

interface KeywordFieldProps {
  id: string;
  value: string;
  // Mots des pages du lieu choisi qui commencent par la saisie.
  suggestions: WordSuggestions;
  onChange: (value: string) => void;
  onChoose: (word: string) => void;
}

// Champ « Mot-clé » : les mots proposés existent tels quels dans les pages
// publiées, avec le nombre de pages qui les contiennent.
export function KeywordField({
  id,
  value,
  suggestions: { typed, data, loading },
  onChange,
  onChoose,
}: KeywordFieldProps) {
  return (
    <Combobox
      id={id}
      label="Mot-clé"
      hint="Par exemple : retraite"
      name="q"
      value={value}
      onValueChange={onChange}
      options={data ?? []}
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
      onSelect={(suggestion) => onChoose(suggestion.word)}
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
