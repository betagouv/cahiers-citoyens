export function deliveryFileName(createdAt: Date): string {
  const iso = createdAt.toISOString();
  return `delivery-${iso.slice(0, 10)}-${iso.slice(11, 13)}${iso.slice(14, 16)}.zip`;
}
