import { Button } from "@codegouvfr/react-dsfr/Button";
import {
  type PageCountState,
  submitLabel,
} from "@/lib/page-search/submit-label";

// Roue de chargement décorative : le libellé « Voir les pages » dit déjà
// que le nombre arrive.
function Spinner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="mr-2 size-4 motion-safe:animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="42 100"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SubmitButton({ count }: { count: PageCountState }) {
  return (
    <Button
      type="submit"
      className="w-full justify-center md:w-auto md:min-w-[13rem]"
    >
      {count.status === "loading" && <Spinner />}
      {submitLabel(count)}
    </Button>
  );
}
