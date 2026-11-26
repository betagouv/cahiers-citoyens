import { errorMessage } from "./error-message";

// Erreur d'une exécution du job : `scope` est le nom du dépôt concerné,
// `embed` pour la vectorisation, `run` pour le job lui-même.
export interface RunError {
  scope: string;
  message: string;
}

export function runError(scope: string, error: unknown): RunError {
  return { scope, message: errorMessage(error) };
}
