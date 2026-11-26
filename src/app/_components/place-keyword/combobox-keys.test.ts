import { describe, expect, it } from "vitest";
import { type ListState, comboboxKey } from "./combobox-keys";

const closed: ListState = { open: false, activeIndex: -1 };
const openNone: ListState = { open: true, activeIndex: -1 };

function at(activeIndex: number): ListState {
  return { open: true, activeIndex };
}

describe("comboboxKey", () => {
  it("ouvre la liste sur la première ou la dernière option", () => {
    expect(comboboxKey("ArrowDown", false, closed, 3, true)).toEqual({
      state: at(0),
    });
    expect(comboboxKey("ArrowUp", false, closed, 3, true)).toEqual({
      state: at(2),
    });
  });

  it("parcourt les options en boucle", () => {
    expect(comboboxKey("ArrowDown", false, openNone, 3, true)?.state).toEqual(
      at(0),
    );
    expect(comboboxKey("ArrowDown", false, at(2), 3, true)?.state).toEqual(
      at(0),
    );
    expect(comboboxKey("ArrowUp", false, openNone, 3, true)?.state).toEqual(
      at(2),
    );
    expect(comboboxKey("ArrowUp", false, at(0), 3, true)?.state).toEqual(at(2));
    expect(comboboxKey("ArrowUp", false, at(2), 3, true)?.state).toEqual(at(1));
  });

  it("ouvre sans déplacer avec Alt+Flèche bas", () => {
    expect(comboboxKey("ArrowDown", true, closed, 3, true)).toEqual({
      state: { open: true, activeIndex: -1 },
    });
  });

  it("laisse les flèches au champ sans option", () => {
    expect(comboboxKey("ArrowDown", false, closed, 0, true)).toBeUndefined();
    expect(comboboxKey("ArrowUp", false, closed, 0, true)).toBeUndefined();
  });

  it("va à la première ou à la dernière option avec Début et Fin", () => {
    expect(comboboxKey("Home", false, at(2), 3, true)?.state).toEqual(at(0));
    expect(comboboxKey("End", false, at(0), 3, true)?.state).toEqual(at(2));
    expect(comboboxKey("Home", false, openNone, 3, true)).toBeUndefined();
    expect(comboboxKey("End", false, closed, 3, true)).toBeUndefined();
  });

  it("choisit l'option active avec Entrée, sinon envoie le formulaire", () => {
    expect(comboboxKey("Enter", false, at(1), 3, true)).toEqual({
      state: closed,
      action: "select",
    });
    expect(comboboxKey("Enter", false, openNone, 3, true)).toBeUndefined();
  });

  it("ferme avec Échap, puis vide le champ", () => {
    expect(comboboxKey("Escape", false, at(1), 3, true)).toEqual({
      state: closed,
    });
    expect(comboboxKey("Escape", false, closed, 3, true)).toEqual({
      state: closed,
      action: "clear",
    });
    expect(comboboxKey("Escape", false, closed, 3, false)).toBeUndefined();
  });

  it("ignore les autres touches", () => {
    expect(comboboxKey("a", false, at(1), 3, true)).toBeUndefined();
  });
});
