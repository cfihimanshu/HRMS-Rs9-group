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

/**
 * Client & Server safe permission checker.
 * Checks if a user object has access based on:
 * 1. Owner / Director role
 * 2. Case-insensitive allowed roles list
 * 3. Administration department membership
 * 4. Explicit menuAccess attached to user session
 */
export function checkUserAccess(
  sessionUser: any,
  allowedRoles: string[] = [],
  menuSlugs: string[] = []
): boolean {
  if (!sessionUser) return false;
  const role = (sessionUser.role || "").toString().trim().toLowerCase();
  const dept = (sessionUser.department || "").toString().trim().toLowerCase();

  // 1. Owner & Director always have full access
  if (["owner", "director"].includes(role)) {
    return true;
  }

  // 2. Check case-insensitive allowed roles
  const normAllowed = allowedRoles.map(r => r.toLowerCase());
  if (normAllowed.includes(role)) {
    return true;
  }

  // 3. Administration department members have full access
  if (dept.includes("administration")) {
    return true;
  }

  // 4. Check explicitly granted menuAccess from sessionUser object
  if (sessionUser.menuAccess && menuSlugs.length > 0) {
    try {
      const parsed = typeof sessionUser.menuAccess === "string" ? JSON.parse(sessionUser.menuAccess) : sessionUser.menuAccess;
      if (Array.isArray(parsed)) {
        const normParsed = parsed.map((s: string) => String(s).toLowerCase().trim());
        const normSlugs = menuSlugs.map(s => String(s).toLowerCase().trim());
        if (normSlugs.some(slug => normParsed.includes(slug))) {
          return true;
        }
      }
    } catch (_) {}
  }

  return false;
}
