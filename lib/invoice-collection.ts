export const INVOICE_COLLECTION_STATUSES = ["Denied", "Easy Payment", "Hard to Collect", "Disallowed by Bank"] as const;

export function collectionRemarkRequired(status: string) {
  return status !== "Easy Payment";
}

export function validateCollectionUpdate(status: unknown, remark: unknown): string | null {
  if (!INVOICE_COLLECTION_STATUSES.includes(status as typeof INVOICE_COLLECTION_STATUSES[number])) return "Select a valid collection status";
  if (typeof remark !== "string") return "Enter a valid collection remark";
  if (collectionRemarkRequired(String(status)) && !remark.trim()) return "Remark is required for this collection status";
  if (remark.trim().length > 2000) return "Collection remark must be 2000 characters or fewer";
  return null;
}
