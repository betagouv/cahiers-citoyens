import { errorMessage } from "./error-message";
import type { ImageStorage } from "./image-storage";

// Supprime des fichiers qui ne sont plus servis, après le commit qui les a
// détachés. Au mieux : un échec est journalisé et n'arrête rien, le fichier
// reste seulement en trop dans le bucket. Renvoie les clés non supprimées.
export async function removeFiles(
  storage: ImageStorage,
  keys: readonly string[],
  log: (message: string) => void,
): Promise<string[]> {
  const failed: string[] = [];
  for (const key of keys) {
    try {
      await storage.remove(key);
    } catch (error) {
      failed.push(key);
      log(`Suppression de ${key} impossible : ${errorMessage(error)}`);
    }
  }
  return failed;
}
