"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { MainNavigation } from "@codegouvfr/react-dsfr/MainNavigation";

const NAVIGATION_ITEMS = [
  { text: "Accueil", href: "/", segment: null },
  {
    text: "Comprendre les cahiers",
    href: "/understanding",
    segment: "understanding",
  },
  {
    text: "Publication des cahiers",
    href: "/publication",
    segment: "publication",
  },
  { text: "Questions fréquentes", href: "/faq", segment: "faq" },
] as const;

// Le premier segment résolu par le routeur, et non `usePathname()` : il est
// connu au build, même sous `/notebooks/[id]`, donc ne suspend pas avec Cache
// Components ; et sur un cahier inconnu, réécrit par `src/proxy.ts` vers la
// page 404, il ne désigne aucune rubrique côté serveur comme côté navigateur.
export function HeaderNavigation() {
  const segment = useSelectedLayoutSegment();
  return (
    <MainNavigation
      id="fr-header-main-navigation"
      items={NAVIGATION_ITEMS.map(({ text, href, segment: itemSegment }) => ({
        text,
        linkProps: { href },
        isActive: segment === itemSegment,
      }))}
    />
  );
}
