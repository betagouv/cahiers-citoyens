"use client";

import { useEffect, useState } from "react";

export const DEBOUNCE_MS = 150;

export interface DebouncedJson<T> {
  // Dernière réponse reçue ; pendant un nouveau chargement, celle de l'URL
  // précédente reste affichée plutôt qu'une liste vide qui clignote.
  // `undefined` aussi après une erreur : rien n'est affirmé.
  data: T | undefined;
  loading: boolean;
}

interface Result<T> {
  url: string;
  data: T | undefined;
}

// Le corps JSON, ou `undefined` si le serveur répond en erreur.
async function fetchJson(
  url: string,
  signal: AbortSignal,
): Promise<{ json: unknown } | undefined> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return undefined;
  const json: unknown = await response.json();
  return { json };
}

// Lit `url` en JSON 150 ms après son dernier changement, et abandonne la
// requête précédente : une frappe rapide ne lance qu'une requête, et une
// réponse lente ne remplace jamais une plus récente. `null` : rien à lire.
// `parse` relit la réponse en type du domaine ; il doit être stable
// (fonction de module).
export function useDebouncedJson<T>(
  url: string | null,
  parse: (json: unknown) => T,
): DebouncedJson<T> {
  const [result, setResult] = useState<Result<T>>();

  useEffect(() => {
    if (url === null) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetchJson(url, controller.signal)
        .catch(() => undefined)
        .then((body) => {
          if (controller.signal.aborted) return;
          setResult({
            url,
            data: body === undefined ? undefined : parse(body.json),
          });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [url, parse]);

  if (url === null) return { data: undefined, loading: false };
  return { data: result?.data, loading: result?.url !== url };
}
