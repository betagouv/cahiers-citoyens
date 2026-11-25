import type { ReactNode } from "react";

export function optionId(id: string, index: number): string {
  return `${id}-option-${index}`;
}

interface ComboboxPopupProps {
  // Identifiant du champ : la liste et ses options en dérivent le leur.
  id: string;
  label: string;
  expanded: boolean;
  options: readonly ReactNode[];
  activeIndex: number;
  onChoose: (index: number) => void;
  emptyText: string | undefined;
  footer: ReactNode;
}

// La liste de suggestions et son encadré d'aide, sous le champ. L'encadré est
// hors de la liste (`listbox`) : ses liens restent atteignables à la
// tabulation, la liste ne contient que des options.
export function ComboboxPopup({
  id,
  label,
  expanded,
  options,
  activeIndex,
  onChoose,
  emptyText,
  footer,
}: ComboboxPopupProps) {
  return (
    <div
      hidden={!expanded}
      className="absolute inset-x-0 top-full z-[1000] bg-[var(--background-default-grey)] shadow-[var(--overlap-shadow)]"
    >
      <ul
        id={`${id}-listbox`}
        role="listbox"
        aria-label={label}
        className="fr-raw-list fr-m-0 fr-p-0"
      >
        {options.map((option, index) => (
          <li
            key={index}
            id={optionId(id, index)}
            role="option"
            aria-selected={index === activeIndex}
            // Le champ garde le focus : l'option est choisie au clic, sans
            // que le champ ne le perde entre l'appui et le relâchement.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onChoose(index)}
            className="flex min-h-11 cursor-pointer items-center justify-between gap-4 px-4 py-2 hover:bg-[var(--background-default-grey-hover)] aria-selected:bg-[var(--background-default-grey-active)] aria-selected:outline-2 aria-selected:outline-offset-[-2px] aria-selected:outline-[#0a76f6] aria-selected:outline-solid"
          >
            {option}
          </li>
        ))}
      </ul>
      {emptyText !== undefined && options.length === 0 && (
        <p className="fr-mb-0 px-4 py-3">{emptyText}</p>
      )}
      <div className="fr-p-2w bg-[var(--background-alt-beige-gris-galet)]">
        {footer}
      </div>
    </div>
  );
}
