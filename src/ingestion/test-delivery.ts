import { jpegBytes, pngBytes } from "./test-images";
import { EXAMPLE_ID, exampleNotebook } from "./test-notebook";
import { zipBuffer } from "./test-zip";

// ZIP d'un dépôt de test : l'exemple du protocole, page 1 en JPEG nommé
// `.png`, page 3 en vrai PNG. Changer la commune change l'empreinte.
export function exampleDeliveryZip(
  municipality = "Exempleville",
): Promise<Buffer> {
  const notebook = exampleNotebook();
  notebook.metadonnees.commune = municipality;
  return zipBuffer([
    {
      name: `${EXAMPLE_ID}.json`,
      bytes: JSON.stringify(notebook),
      compress: true,
    },
    { name: `${EXAMPLE_ID}_1.png`, bytes: jpegBytes(2484, 3507) },
    { name: `${EXAMPLE_ID}_3.png`, bytes: pngBytes(2484, 3507) },
  ]);
}
