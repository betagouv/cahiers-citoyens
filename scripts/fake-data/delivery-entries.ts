import type { DeliverySpec } from "./delivery-plan";
import { injectDefect } from "./inject-defect";
import { renderNotebookContent } from "./notebook-content";
import {
  type ArchiveEntry,
  draftEntries,
  draftNotebook,
} from "./notebook-draft";

export async function* deliveryEntries(
  spec: DeliverySpec,
): AsyncGenerator<ArchiveEntry> {
  for (const notebook of spec.notebooks) {
    const content = await renderNotebookContent(notebook, spec.seed);
    yield* draftEntries(
      notebook.defects.reduce(injectDefect, draftNotebook(content)),
    );
  }
}
