import Link from "next/link";
import { fr } from "@codegouvfr/react-dsfr";

interface HelpBoxProps {
  title: string;
  text: string;
  linkLabel: string;
  href: string;
}

// Encadré d'aide sous une liste de suggestions.
export function HelpBox({ title, text, linkLabel, href }: HelpBoxProps) {
  return (
    <>
      <p className={fr.cx("fr-text--sm", "fr-text--bold", "fr-mb-1v")}>
        {title}
      </p>
      <p className={fr.cx("fr-text--xs", "fr-mb-1v")}>{text}</p>
      <Link className={fr.cx("fr-link", "fr-text--xs")} href={href}>
        {linkLabel}
      </Link>
    </>
  );
}
