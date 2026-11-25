// Clavier d'une liste de suggestions, selon le motif « combobox » d'ARIA 1.2
// (APG, liste à autocomplétion) : le focus reste dans le champ, l'option
// active est désignée par `aria-activedescendant`.

export interface ListState {
  open: boolean;
  // -1 : aucune option active.
  activeIndex: number;
}

export interface KeyResult {
  state: ListState;
  // `select` : choisir l'option active ; `clear` : vider le champ.
  action?: "select" | "clear";
}

const CLOSED: ListState = { open: false, activeIndex: -1 };

function move(state: ListState, count: number, step: 1 | -1): ListState {
  if (!state.open) {
    return { open: true, activeIndex: step === 1 ? 0 : count - 1 };
  }
  const from =
    state.activeIndex === -1 && step === -1 ? count : state.activeIndex;
  return { open: true, activeIndex: (from + step + count) % count };
}

// Le nouvel état après une touche, ou `undefined` si la touche garde son
// comportement natif (curseur, envoi du formulaire, tabulation).
export function comboboxKey(
  key: string,
  altKey: boolean,
  state: ListState,
  optionCount: number,
  hasValue: boolean,
): KeyResult | undefined {
  const active = state.open && state.activeIndex !== -1;
  switch (key) {
    case "ArrowDown":
      if (optionCount === 0) return undefined;
      if (altKey) return { state: { ...state, open: true } };
      return { state: move(state, optionCount, 1) };
    case "ArrowUp":
      if (optionCount === 0) return undefined;
      return { state: move(state, optionCount, -1) };
    case "Home":
      return active ? { state: { open: true, activeIndex: 0 } } : undefined;
    case "End":
      return active
        ? { state: { open: true, activeIndex: optionCount - 1 } }
        : undefined;
    case "Enter":
      return active ? { state: CLOSED, action: "select" } : undefined;
    case "Escape":
      if (state.open) return { state: CLOSED };
      return hasValue ? { state: CLOSED, action: "clear" } : undefined;
    default:
      return undefined;
  }
}
