"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { MainNavigation } from "@codegouvfr/react-dsfr/MainNavigation";

// Le premier segment résolu par le routeur, et non `usePathname()` : il est
// connu au build, même sous `/notebooks/[id]`, donc ne suspend pas avec Cache
// Components ; et sur un cahier inconnu, réécrit par `src/proxy.ts` vers la
// page 404, il ne désigne aucune rubrique côté serveur comme côté navigateur.
export function HeaderNavigation() {
  const segment = useSelectedLayoutSegment();
  return (
    <MainNavigation
      id="fr-header-main-navigation"
      items={[
        {
          text: "Rechercher",
          linkProps: { href: "/search" },
          isActive: segment === "search",
        },
        {
          text: "Cahiers",
          linkProps: { href: "/notebooks" },
          isActive: segment === "notebooks",
        },
      ]}
    />
  );
}
