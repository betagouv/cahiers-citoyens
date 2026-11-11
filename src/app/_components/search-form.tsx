import Form from "next/form";
import { fr } from "@codegouvfr/react-dsfr";

interface SearchFormProps {
  id: string;
  defaultValue?: string;
  big?: boolean;
}

// Balisage de la barre de recherche DSFR dans un vrai formulaire GET : le
// composant SearchBar de react-dsfr navigue en JavaScript, alors qu'ici
// `/search?q=…` doit marcher sans lui et se partager comme un lien.
export function SearchForm({ id, defaultValue, big = false }: SearchFormProps) {
  const inputId = `${id}-input`;
  return (
    <Form
      action="/search"
      role="search"
      id={id}
      className={fr.cx("fr-search-bar", big && "fr-search-bar--lg")}
    >
      <label className={fr.cx("fr-label")} htmlFor={inputId}>
        Rechercher dans les cahiers
      </label>
      <input
        className={fr.cx("fr-input")}
        id={inputId}
        name="q"
        type="search"
        placeholder="Ex. : Il n'y a plus de médecin au village"
        defaultValue={defaultValue}
        maxLength={500}
      />
      <button className={fr.cx("fr-btn")} type="submit" title="Rechercher">
        Rechercher
      </button>
    </Form>
  );
}
