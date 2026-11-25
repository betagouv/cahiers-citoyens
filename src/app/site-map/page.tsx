import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Plan du site" };

const SITE_PAGES = [
  { href: "/", label: "Accueil" },
  { href: "/search", label: "Rechercher dans les cahiers" },
  { href: "/notebooks", label: "Tous les cahiers" },
  { href: "/understanding", label: "Comprendre les cahiers" },
  { href: "/publication", label: "Publication des cahiers" },
  { href: "/faq", label: "Questions fréquentes" },
  { href: "/accessibility", label: "Accessibilité" },
  { href: "/legal-notice", label: "Mentions légales" },
  { href: "/personal-data", label: "Données personnelles" },
];

export default function Page() {
  return (
    <div className="fr-container fr-py-8w">
      <h1>Plan du site</h1>
      <ul>
        {SITE_PAGES.map((page) => (
          <li key={page.href}>
            <Link className="fr-link" href={page.href}>
              {page.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
