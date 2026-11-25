export const DELIVERY_STATUSES = [
  "received",
  "verifying",
  "applying",
  "applied",
  "rejected",
  "failed",
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

// Transitions autorisées depuis chaque statut. `rejected` (dépôt invalide,
// Condorcet en renvoie un autre) et `applied` sont terminaux. `failed` vient de
// nous : le job suivant relance la vérification.
export const DELIVERY_TRANSITIONS: Readonly<
  Record<DeliveryStatus, readonly DeliveryStatus[]>
> = {
  received: ["verifying", "failed"],
  verifying: ["applying", "rejected", "failed"],
  applying: ["applied", "failed"],
  applied: [],
  rejected: [],
  failed: ["verifying"],
};

export function canTransition(
  from: DeliveryStatus,
  to: DeliveryStatus,
): boolean {
  return DELIVERY_TRANSITIONS[from].includes(to);
}

export function assertTransition(
  from: DeliveryStatus,
  to: DeliveryStatus,
): void {
  if (!canTransition(from, to)) {
    throw new Error(`Transition de dépôt interdite : ${from} → ${to}`);
  }
}
