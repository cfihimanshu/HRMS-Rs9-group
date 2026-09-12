// Recovery masters historically store a branch code in branchId; branch names
// disambiguate legacy numeric IDs that can collide with another branch's code.
export function resolveRecoveryBranch(branches: any[], bankId: unknown, branchId: unknown, branchName: unknown) {
  const scoped = branches.filter(branch => String(branch.bankId) === String(bankId));
  const name = String(branchName || "").trim().toLowerCase();
  const key = String(branchId || "").trim();
  if (name) {
    const named = scoped.filter(branch => String(branch.branchName || "").trim().toLowerCase() === name);
    return named.find(branch => String(branch.branchCode || "") === key)
      || named.find(branch => String(branch.id) === key)
      || (named.length === 1 ? named[0] : undefined);
  }
  return scoped.find(branch => String(branch.branchCode || "") === key && key)
    || scoped.find(branch => String(branch.id) === key && key);
}
