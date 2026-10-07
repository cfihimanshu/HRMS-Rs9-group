export function invoiceUpdateAudit(user: { id?: unknown; name?: unknown; email?: unknown }) {
  return {
    updatedById: String(user.id || user.email || user.name || ""),
    updatedByName: String(user.name || user.email || user.id || ""),
    lastModifiedAt: new Date(),
  };
}
