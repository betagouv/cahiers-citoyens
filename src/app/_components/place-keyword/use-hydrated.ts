"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => undefined;
}

// Faux au rendu serveur et à l'hydratation, vrai ensuite : ce qui ne marche
// qu'avec JavaScript (champ caché rempli par le script) n'apparaît qu'alors.
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
