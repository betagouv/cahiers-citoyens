import type { Metadata } from "next";
import { Footer } from "@codegouvfr/react-dsfr/Footer";
import { Header } from "@codegouvfr/react-dsfr/Header";
import { SkipLinks } from "@codegouvfr/react-dsfr/SkipLinks";
import { DsfrProvider } from "@/dsfr-bootstrap";
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
          <SkipLinks
            links={[
              { label: "Accéder au contenu", anchor: "#content" },
              { label: "Accéder au pied de page", anchor: "#footer" },
            ]}
          />
          <Header
            brandTop={brandTop}
            serviceTitle="Cahiers citoyens"
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
          />
        </DsfrProvider>
      </body>
    </html>
  );
}
