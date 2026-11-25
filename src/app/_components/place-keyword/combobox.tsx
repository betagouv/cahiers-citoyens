"use client";

import { type ReactNode, useRef } from "react";
import { fr } from "@codegouvfr/react-dsfr";
import { ComboboxPopup, optionId } from "./combobox-popup";
import { useCombobox } from "./use-combobox";

export interface ComboboxProps<Option> {
  id: string;
  label: string;
  hint: string;
  // Nom du champ envoyé avec le formulaire ; `undefined` : non envoyé.
  name: string | undefined;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly Option[];
  optionKey: (option: Option) => string;
  renderOption: (option: Option) => ReactNode;
  onSelect: (option: Option) => void;
  clearLabel: string;
  // Texte affiché quand la recherche est faite et ne propose rien.
  emptyText: string | undefined;
  footer: ReactNode;
  maxLength: number;
}

export function statusText(count: number, emptyText?: string): string {
  if (count === 0) return emptyText ?? "";
  return count === 1
    ? "1 suggestion. Flèches haut et bas pour la sélectionner."
    : `${count} suggestions. Flèches haut et bas pour les parcourir.`;
}

// Cible de 44 px, débordant de 2 px le champ de 40 px, icône grise centrée
// comme sur la maquette ; le libellé reste lu par les aides techniques.
const CLEAR_BUTTON =
  "absolute right-0 top-[-0.125rem] !h-11 !max-h-11 !min-h-11 !w-11 !max-w-11 justify-center !p-0 !text-[var(--text-mention-grey)] before:!m-0";

function ClearButton({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClear}
      className={`${fr.cx("fr-btn", "fr-btn--tertiary-no-outline", "fr-icon-close-circle-fill")} ${CLEAR_BUTTON}`}
    >
      <span className={fr.cx("fr-sr-only")}>{label}</span>
    </button>
  );
}

// Champ DSFR avec liste de suggestions, au motif « combobox » d'ARIA 1.2.
export function Combobox<Option>(props: ComboboxProps<Option>) {
  const { id, value, options } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const box = useCombobox({
    ...props,
    showsEmpty: props.emptyText !== undefined,
    inputRef,
  });
  return (
    <div className={fr.cx("fr-input-group", "fr-mb-0")} onBlur={box.onBlur}>
      <label className={fr.cx("fr-label")} htmlFor={id}>
        {props.label}
        <span className={fr.cx("fr-hint-text")}>{props.hint}</span>
      </label>
      <div className="fr-mt-1w relative">
        <input
          ref={inputRef}
          id={id}
          name={props.name}
          className={`${fr.cx("fr-input")}${value === "" ? "" : " !pr-12"}`}
          type="text"
          role="combobox"
          aria-expanded={box.expanded}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={
            box.expanded && box.activeIndex !== -1
              ? optionId(id, box.activeIndex)
              : undefined
          }
          autoComplete="off"
          enterKeyHint="search"
          maxLength={props.maxLength}
          value={value}
          onChange={(event) => box.type(event.target.value)}
          onKeyDown={box.onKeyDown}
        />
        {value !== "" && (
          <ClearButton label={props.clearLabel} onClear={box.clear} />
        )}
        <ComboboxPopup
          id={id}
          label={props.label}
          expanded={box.expanded}
          options={options.map(props.renderOption)}
          activeIndex={box.activeIndex}
          onChoose={box.choose}
          emptyText={props.emptyText}
          footer={props.footer}
        />
      </div>
      <p role="status" className={fr.cx("fr-sr-only")}>
        {box.expanded ? statusText(options.length, props.emptyText) : ""}
      </p>
    </div>
  );
}
