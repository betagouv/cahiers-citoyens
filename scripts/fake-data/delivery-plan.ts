import { composeNotebook } from "./compose";
import { DEFECTS, type Defect } from "./defects";
import type { Notebook } from "./domain";
import { createRandom } from "./random";
import { sourceId } from "./source-id";

export const NOTEBOOK_CHANGES = ["none", "text", "image"] as const;

export type NotebookChange = (typeof NOTEBOOK_CHANGES)[number];

export interface NotebookSpec {
  index: number;
  id: string;
  notebook: Notebook;
  change: NotebookChange;
  defects: Defect[];
}

export interface DeliverySpec {
  seed: string;
  createdAt: Date;
  notebooks: NotebookSpec[];
}

export interface DeliveryOptions {
  count: number;
  seed: string;
  createdAt: Date;
  modify: number;
  defects: readonly Defect[];
}

// Un défaut par cahier tant qu'il y a assez de cahiers ; au-delà, un cahier en cumule.
export function planDelivery(options: DeliveryOptions): DeliverySpec {
  const { count, seed } = options;
  const indices = Array.from({ length: count }, (_, i) => i + 1);

  const changes = new Map<number, NotebookChange>();
  const modifyRandom = createRandom(`${seed}:modify`);
  for (const index of modifyRandom.shuffle(indices).slice(0, options.modify)) {
    changes.set(index, modifyRandom.pick(["text", "image"] as const));
  }

  const defects = new Map<number, Defect[]>();
  const targets = createRandom(`${seed}:defects`).shuffle(indices);
  DEFECTS.filter((defect) => options.defects.includes(defect)).forEach(
    (defect, i) => {
      const index = targets[i % count];
      defects.set(index, [...(defects.get(index) ?? []), defect]);
    },
  );

  return {
    seed,
    createdAt: options.createdAt,
    notebooks: indices.map((index) => {
      // Même étiquette que generate.ts : mêmes cahiers pour une même graine.
      const notebook = composeNotebook(
        index,
        createRandom(`${seed}:texte:${index}`),
      );
      return {
        index,
        id: sourceId(notebook, index, seed),
        notebook,
        change: changes.get(index) ?? "none",
        defects: defects.get(index) ?? [],
      };
    }),
  };
}
