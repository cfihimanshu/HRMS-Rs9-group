export const BASE_SYSTEM_ROLES = [
  "Owner",
  "Director",
  "HR Head",
  "HR Executive",
  "Department Manager",
  "Employee",
  "Accounts",
  "Trainer",
  "IT Admin",
  "DSM",
  "RIBP / Risk Officer",
  "Business Associate",
  "Vendor",
  "Franchisee",
  "Territory Partner"
];

/**
 * Client & Server safe role normalizer.
 * If rawRole matches a base system role, returns standard title-cased name.
 * If rawRole is a new custom role added in DB or frontend, preserves its title/name dynamically without forcing it to fallback to 'Employee'.
 */
export function normalizeRole(rawRole: unknown, customRoles: string[] = []): string {
  if (!rawRole || typeof rawRole !== "string") return "Employee";
  const trimmed = rawRole.trim();
  if (!trimmed) return "Employee";

  // Check base system roles case-insensitively
  const matchedBase = BASE_SYSTEM_ROLES.find(
    r => r.toLowerCase() === trimmed.toLowerCase()
  );
  if (matchedBase) return matchedBase;

  // Check custom database roles list
  const matchedCustom = customRoles.find(
    r => r.toLowerCase() === trimmed.toLowerCase()
  );
  if (matchedCustom) return matchedCustom;

  // Preserve dynamic custom role as-is
  return trimmed;
}
