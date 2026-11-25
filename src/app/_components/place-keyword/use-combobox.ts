"use client";

import {
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
  useState,
} from "react";
import { comboboxKey } from "./combobox-keys";

interface ComboboxOptions<Option> {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly Option[];
  optionKey: (option: Option) => string;
  onSelect: (option: Option) => void;
  // La liste s'ouvre aussi sans option, pour dire que rien ne correspond.
  showsEmpty: boolean;
  // Le champ, qui reprend le focus quand on le vide.
  inputRef: RefObject<HTMLInputElement | null>;
}

// État d'une liste de suggestions : ouverte ou non, option active (gardée
// par sa clé : elle reste active si la liste se met à jour autour d'elle).
export function useCombobox<Option>({
  value,
  onValueChange,
  options,
  optionKey,
  onSelect,
  showsEmpty,
  inputRef,
}: ComboboxOptions<Option>) {
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const activeIndex = options.findIndex(
    (option) => optionKey(option) === activeKey,
  );
  const expanded = open && (options.length > 0 || showsEmpty);

  function choose(index: number) {
    setOpen(false);
    setActiveKey(null);
    onSelect(options[index]);
  }

  function clear() {
    setOpen(false);
    onValueChange("");
    inputRef.current?.focus();
  }

  function type(text: string) {
    onValueChange(text);
    setOpen(true);
    setActiveKey(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const result = comboboxKey(
      event.key,
      event.altKey,
      { open: expanded, activeIndex },
      options.length,
      value !== "",
    );
    if (result === undefined) return;
    event.preventDefault();
    if (result.action === "select") return choose(activeIndex);
    if (result.action === "clear") return clear();
    const { open: nextOpen, activeIndex: nextIndex } = result.state;
    setOpen(nextOpen);
    setActiveKey(nextIndex === -1 ? null : optionKey(options[nextIndex]));
  }

  return {
    expanded,
    activeIndex,
    choose,
    clear,
    type,
    onKeyDown,
    // La liste se ferme quand le focus quitte le champ, son bouton et
    // l'encadré d'aide, tous dans `event.currentTarget`.
    onBlur(event: FocusEvent<HTMLElement>) {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    },
  };
}
