import type { IngestError } from "./errors";

const DELIVERY_NAME = /^delivery-(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})\.zip$/;

export function deliveryFileName(createdAt: Date): string {
  const iso = createdAt.toISOString();
  return `delivery-${iso.slice(0, 10)}-${iso.slice(11, 13)}${iso.slice(14, 16)}.zip`;
}

// Le nom porte une minute UTC qui existe : `delivery-2026-02-30-0930.zip` est refusé.
function isDeliveryName(name: string): boolean {
  const match = DELIVERY_NAME.exec(name);
  if (match === null) {
    return false;
  }
  const [year, month, day, hours, minutes] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  return deliveryFileName(date) === name;
}

export function checkDeliveryName(name: string): IngestError[] {
  if (isDeliveryName(name)) {
    return [];
  }
  return [
    {
      file: name,
      code: "invalid-delivery-name",
      message: `Le dépôt s'appelle ${name} : nom attendu delivery-AAAA-MM-JJ-HHMM.zip, avec une date et une heure UTC réelles.`,
    },
  ];
}
