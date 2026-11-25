import Form from "next/form";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { Input } from "@codegouvfr/react-dsfr/Input";

// Un vrai formulaire GET, comme `SearchForm` : il marche sans JavaScript.
export function HomeSearchForm() {
  return (
    <Form
      action="/search"
      role="search"
      className="flex flex-col gap-4 md:flex-row md:items-end"
    >
      <Input
        className="fr-mb-0 md:flex-1"
        label="Lieu"
        hintText="Commune, code postal ou département"
        nativeInputProps={{ name: "place", autoComplete: "off" }}
      />
      <Input
        className="fr-mb-0 md:flex-1"
        label="Mot-clé"
        hintText="Par exemple : retraite"
        nativeInputProps={{ name: "q", type: "search", maxLength: 500 }}
      />
      <Button type="submit" className="w-full justify-center md:w-auto">
        Rechercher
      </Button>
    </Form>
  );
}
