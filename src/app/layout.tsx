import type { Metadata } from "next";
import { headerFooterDisplayItem } from "@codegouvfr/react-dsfr/Display";
import { Footer } from "@codegouvfr/react-dsfr/Footer";
import { Header } from "@codegouvfr/react-dsfr/Header";
import { SkipLinks } from "@codegouvfr/react-dsfr/SkipLinks";
import { DsfrProvider, StartDsfrOnHydration } from "@/dsfr-bootstrap";
import {
  DsfrHead,
  getHtmlAttributes,
} from "@/dsfr-bootstrap/server-only-index";
import { HeaderNavigation } from "./_components/header-navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Cahiers citoyens",
    template: "%s | Cahiers citoyens",
  },
};

const brandTop = (
  <>
    République
    <br />
    Française
  </>
);

const homeLinkProps = { href: "/", title: "Accueil - Cahiers citoyens" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  const lang = "fr";

  return (
    <html {...getHtmlAttributes({ lang })}>
      <head>
        <DsfrHead
          preloadFonts={[
            "Marianne-Regular",
            "Marianne-Medium",
            "Marianne-Bold",
          ]}
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <DsfrProvider lang={lang}>
          {/* Sans lui, le JavaScript du DSFR ne démarre pas : ni la modale
              « Paramètres d'affichage » ni le menu mobile ne s'ouvrent. */}
          <StartDsfrOnHydration />
          <SkipLinks
            links={[
              { label: "Accéder au contenu", anchor: "#content" },
              { label: "Accéder au pied de page", anchor: "#footer" },
            ]}
          />
          <Header
            brandTop={brandTop}
            serviceTitle="Cahiers citoyens"
            serviceTagline="Consulter les cahiers du Grand Débat national"
            quickAccessItems={[headerFooterDisplayItem]}
            homeLinkProps={homeLinkProps}
            navigation={<HeaderNavigation />}
          />
          <main id="content" className="flex-1">
            {children}
          </main>
          <Footer
            id="footer"
            brandTop={brandTop}
            homeLinkProps={homeLinkProps}
            accessibility="non compliant"
            contentDescription="Ce site donne accès aux cahiers citoyens du Grand Débat national, numérisés et transcrits. Il est édité par la DITP et la DINUM, avec le Campus Condorcet."
            accessibilityLinkProps={{ href: "/accessibility" }}
            termsLinkProps={{ href: "/legal-notice" }}
            // Plan du site passe par bottomItems plutôt que websiteMapLinkProps,
            // que react-dsfr place en tête : l'ordre suit ainsi la maquette.
            bottomItems={[
              {
                text: "Données personnelles",
                linkProps: { href: "/personal-data" },
              },
              { text: "Plan du site", linkProps: { href: "/site-map" } },
              headerFooterDisplayItem,
            ]}
          />
        </DsfrProvider>
      </body>
    </html>
  );
}
