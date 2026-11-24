import Link from "next/link";

const EXAMPLE_QUESTIONS = [
  "Il n'y a plus de médecin au village",
  "Que disent les habitants du prix du carburant ?",
  "Quelles propositions pour le référendum d'initiative citoyenne ?",
];

export function EmptyQuestion() {
  return (
    <div className="fr-mt-4w">
      <p>
        Posez une question en langage courant : la recherche trouve les passages
        des cahiers qui en parlent, même sans les mêmes mots, puis en rédige une
        synthèse sourcée.
      </p>
      <p className="fr-mb-1w">Par exemple :</p>
      <ul>
        {EXAMPLE_QUESTIONS.map((example) => (
          <li key={example}>
            <Link href={`/search?q=${encodeURIComponent(example)}`}>
              {example}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
