export function calculateInvoiceSettlement(bill: number, received: number, tds: number, status: string, reason: string) {
  if (![bill, received, tds].every(Number.isFinite) || [bill, received, tds].some(value => value < 0)) throw new Error("Enter valid non-negative amounts");
  const outstanding = Math.round(Math.max(0, bill - received - tds) * 100) / 100;
  if (status === "Settled" && !reason.trim()) throw new Error("Settlement summary is required");
  return { dueAmount: status === "Settled" ? 0 : outstanding, settlementAmount: status === "Settled" ? outstanding : 0, settlementReason: status === "Settled" ? reason.trim() : null, status: status === "Settled" || status === "Cancelled" ? status : outstanding === 0 ? "Received" : "Pending" };
}
