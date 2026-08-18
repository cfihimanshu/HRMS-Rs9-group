import sequelize from "@/lib/sequelize";
import ApprovalMatrix from "@/models/sequelize/ApprovalMatrix";
import User from "@/models/sequelize/User";

export interface ApproverResolutionResult {
  approverUserIds: string[];
  approverEmails: string[];
  approverRoles: string[];
  notifyEmail: boolean;
  notifyApp: boolean;
}

// Default seed mappings if database matrix record is not yet customized
const DEFAULT_RULES: Record<string, { roles: string[]; notifyEmail: boolean; notifyApp: boolean }> = {
  expense_claims: { roles: ["Owner", "Accounts"], notifyEmail: true, notifyApp: true },
  leave_requests: { roles: ["Owner", "HR Head", "Department Manager"], notifyEmail: true, notifyApp: true },
  asset_requests: { roles: ["Owner", "IT MANAGER"], notifyEmail: true, notifyApp: true },
  hiring_requisition: { roles: ["Owner", "HR Head", "Accounts"], notifyEmail: true, notifyApp: true },
  disciplinary_warnings: { roles: ["Owner", "HR Head"], notifyEmail: true, notifyApp: true },
  inventory_purchase: { roles: ["Owner"], notifyEmail: true, notifyApp: true },
};

/**
 * Dynamically resolves target approvers (User IDs, Emails, Roles) for a given form request.
 * If applicantUserId is provided, checks for explicit requester-specific override rules first.
 */
export async function getApproversForWorkflow(formKey: string, applicantUserId?: string): Promise<ApproverResolutionResult> {
  try {
    await sequelize.authenticate();
    await ApprovalMatrix.sync();

    let rule = await ApprovalMatrix.findByPk(formKey);
    let roles: string[] = [];
    let specificUserIds: string[] = [];
    let userOverrides: Array<{ applicantId: string; approverUserIds: string[] }> = [];
    let notifyEmail = true;
    let notifyApp = true;

    if (rule) {
      try {
        roles = JSON.parse(rule.approverRoles || "[]");
      } catch (e) {
        roles = [];
      }
      try {
        specificUserIds = JSON.parse(rule.approverUsers || "[]");
      } catch (e) {
        specificUserIds = [];
      }
      try {
        userOverrides = JSON.parse(rule.userOverrides || "[]");
      } catch (e) {
        userOverrides = [];
      }
      notifyEmail = rule.notifyEmail ?? true;
      notifyApp = rule.notifyApp ?? true;
    } else {
      // Fallback to default rules
      const def = DEFAULT_RULES[formKey] || { roles: ["Owner"], notifyEmail: true, notifyApp: true };
      roles = def.roles;
      notifyEmail = def.notifyEmail;
      notifyApp = def.notifyApp;
    }

    // Check for explicit applicant override rule if applicantUserId is provided
    if (applicantUserId && Array.isArray(userOverrides) && userOverrides.length > 0) {
      const matchOverride = userOverrides.find((o: any) => {
        if (Array.isArray(o.applicantIds)) {
          return o.applicantIds.some((id: string) => String(id) === String(applicantUserId));
        }
        return String(o.applicantId) === String(applicantUserId);
      });

      if (matchOverride && Array.isArray(matchOverride.approverUserIds) && matchOverride.approverUserIds.length > 0) {
        const overrideUsers = await User.findAll({
          where: { id: matchOverride.approverUserIds },
          attributes: ["id", "name", "email", "role"],
          raw: true,
        }) as any[];

        const userIds = Array.from(new Set(overrideUsers.map((u: any) => u.id).filter(Boolean)));
        const emails = Array.from(new Set(overrideUsers.map((u: any) => u.email).filter(Boolean)));

        return {
          approverUserIds: userIds,
          approverEmails: emails,
          approverRoles: [], // Override bypasses role matching, routes to specific assigned users
          notifyEmail,
          notifyApp,
        };
      }
    }

    if (!rule && roles.length === 0 && specificUserIds.length === 0) {
      roles = ["Owner"];
    }

    // Query matching users by role or specific user IDs, always including Owners
    const allUsers = await User.findAll({
      where: { status: "active" },
      attributes: ["id", "name", "email", "role"],
      raw: true,
    }) as any[];

    const rolesLower = roles.map(r => r.toLowerCase());
    const specIdsStr = specificUserIds.map(id => String(id));

    const matchingUsers = allUsers.filter((u: any) => {
      const uRole = String(u.role || "").toLowerCase();
      if (uRole.includes("owner")) return true;
      if (rolesLower.includes(uRole)) return true;
      if (specIdsStr.includes(String(u.id))) return true;
      return false;
    });

    const userIds = Array.from(new Set(matchingUsers.map((u: any) => u.id).filter(Boolean)));
    const emails = Array.from(new Set(matchingUsers.map((u: any) => u.email).filter(Boolean)));

    return {
      approverUserIds: userIds,
      approverEmails: emails,
      approverRoles: roles,
      notifyEmail,
      notifyApp,
    };
  } catch (error: any) {
    console.error(`[getApproversForWorkflow] Error resolving approvers for ${formKey}:`, error.message);
    // Fallback safely to Owner
    try {
      const allUsers = await User.findAll({ where: { status: "active" }, attributes: ["id", "email", "role"], raw: true }) as any[];
      const owners = allUsers.filter((u: any) => String(u.role || "").toLowerCase().includes("owner"));
      return {
        approverUserIds: owners.map((o: any) => o.id),
        approverEmails: owners.map((o: any) => o.email).filter(Boolean),
        approverRoles: ["Owner"],
        notifyEmail: true,
        notifyApp: true,
      };
    } catch (e) {
      return { approverUserIds: [], approverEmails: [], approverRoles: ["Owner"], notifyEmail: true, notifyApp: true };
    }
  }
}

/**
 * Checks if a specific user ID or user role is dynamically authorized to approve requests for a given formKey.
 * If applicantUserId is passed, evaluates applicant-specific overrides first.
 */
export async function isUserAuthorizedApprover(formKey: string, userId: string, userRole: string, applicantUserId?: string): Promise<boolean> {
  try {
    const roleLower = String(userRole || "").toLowerCase();
    if (roleLower.includes("owner")) return true;

    const routing = await getApproversForWorkflow(formKey, applicantUserId);
    const roleMatch = routing.approverRoles.some(r => r.toLowerCase() === roleLower);
    const userMatch = routing.approverUserIds.includes(String(userId));
    return roleMatch || userMatch;
  } catch (error) {
    return false;
  }
}

/**
 * Resolves whether a user is a general approver or has specific applicant override approvals.
 */
export async function getAuthorizedApplicantIdsForApprover(
  formKey: string,
  userId: string,
  userRole: string
): Promise<{
  isGeneralApprover: boolean;
  overrideApplicantIds: string[];
}> {
  try {
    const roleLower = String(userRole || "").toLowerCase();
    const isOwner = roleLower.includes("owner");

    await sequelize.authenticate();
    await ApprovalMatrix.sync();

    let rule = await ApprovalMatrix.findByPk(formKey);
    let roles: string[] = [];
    let specificUserIds: string[] = [];
    let userOverrides: Array<any> = [];

    if (rule) {
      try { roles = JSON.parse(rule.approverRoles || "[]"); } catch (e) {}
      try { specificUserIds = JSON.parse(rule.approverUsers || "[]"); } catch (e) {}
      try { userOverrides = JSON.parse(rule.userOverrides || "[]"); } catch (e) {}
    } else {
      const def = DEFAULT_RULES[formKey] || { roles: ["Owner"], notifyEmail: true, notifyApp: true };
      roles = def.roles;
    }

    const roleMatch = roles.some((r: string) => r.toLowerCase() === roleLower);
    const userMatch = specificUserIds.some((id: string) => String(id) === String(userId));
    const isGeneralApprover = isOwner || roleMatch || userMatch;

    const overrideApplicantIds: string[] = [];
    if (Array.isArray(userOverrides)) {
      for (const ov of userOverrides) {
        const targetApprovers = Array.isArray(ov.approverUserIds) ? ov.approverUserIds : [];
        const isTarget = targetApprovers.some((id: string) => String(id) === String(userId));
        if (isTarget) {
          if (Array.isArray(ov.applicantIds)) {
            ov.applicantIds.forEach((aId: string) => overrideApplicantIds.push(String(aId)));
          } else if (ov.applicantId) {
            overrideApplicantIds.push(String(ov.applicantId));
          }
        }
      }
    }

    return {
      isGeneralApprover,
      overrideApplicantIds: Array.from(new Set(overrideApplicantIds)),
    };
  } catch (error) {
    return { isGeneralApprover: false, overrideApplicantIds: [] };
  }
}

