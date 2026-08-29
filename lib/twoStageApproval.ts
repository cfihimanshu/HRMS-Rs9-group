import EmployeeProfile from "@/models/sequelize/EmployeeProfile";
import User from "@/models/sequelize/User";

export const RECOMMENDER_PENDING = "Pending Recommender Approval";
export const OWNER_PENDING = "Pending Owner Approval";

const roleOf = (user: any) => String(user?.role || "").trim().toLowerCase();

export function isOwnerUser(user: any) {
  const role = roleOf(user);
  return role.includes("owner") || role.includes("director");
}

export function isDepartmentManagerUser(user: any) {
  const identity = `${roleOf(user)} ${String(user?.designation || "").trim().toLowerCase()}`;
  return identity.includes("manager") || identity.includes("department head") || identity.includes("team lead");
}

async function activeUsers() {
  return User.findAll({ where: { status: "active" }, raw: true }) as Promise<any[]>;
}

async function profilesForUsers(userIds: string[]) {
  if (!userIds.length) return [] as any[];
  return EmployeeProfile.findAll({ raw: true }) as Promise<any[]>;
}

export async function getTwoStageRoute(applicantId: string) {
  const applicant: any = await User.findByPk(applicantId, { raw: true });
  const applicantProfile: any = await EmployeeProfile.findOne({ where: { user: applicantId }, raw: true });
  const users = await activeUsers();
  const owners = users.filter(isOwnerUser);
  const profiles = await profilesForUsers(users.map((u: any) => String(u.id)));
  const profileByUser = new Map(profiles.map((profile: any) => [String(profile.user), profile]));
  const managerUsers = users.filter((user: any) =>
    isDepartmentManagerUser({ ...user, designation: profileByUser.get(String(user.id))?.designation })
  );
  const department = String(applicantProfile?.department || "");

  let recommenders = managerUsers.filter((manager: any) => {
    if (String(manager.id) === String(applicantId)) return false;
    const managerProfile = profileByUser.get(String(manager.id));
    return department && String(managerProfile?.department || "") === department;
  });

  // An explicitly assigned/reporting manager takes precedence when it resolves to an active user.
  const managerRef = String(applicantProfile?.reportingManager || applicantProfile?.assignedManager || "").trim();
  if (managerRef) {
    const normalized = managerRef.replace(/\s*\(.*?\)\s*/g, "").trim().toLowerCase();
    const direct = users.find((u: any) =>
      String(u.id) === managerRef ||
      String(u.name || "").trim().toLowerCase() === normalized
    );
    if (direct && String(direct.id) !== String(applicantId)) recommenders = [direct];
  }

  const startsWithOwner = isOwnerUser(applicant) || isDepartmentManagerUser({
    ...applicant,
    designation: applicantProfile?.designation,
  }) || recommenders.length === 0;
  return {
    applicant,
    applicantProfile,
    recommenders,
    owners,
    initialStatus: startsWithOwner ? OWNER_PENDING : RECOMMENDER_PENDING,
    initialApprovers: startsWithOwner ? owners : recommenders,
  };
}

export async function getDepartmentMemberIds(managerId: string) {
  const profile: any = await EmployeeProfile.findOne({ where: { user: managerId }, raw: true });
  if (!profile?.department) return [String(managerId)];
  const profiles: any[] = await EmployeeProfile.findAll({
    where: { department: profile.department }, raw: true,
  }) as any[];
  return Array.from(new Set([String(managerId), ...profiles.map((p: any) => String(p.user)).filter(Boolean)]));
}

export async function processTwoStageApproval(params: {
  applicantId: string;
  actorId: string;
  requestedStatus: string;
  currentStatus: string;
  finalApprovedStatus?: string;
}) {
  const { applicantId, actorId, requestedStatus, currentStatus } = params;
  const route = await getTwoStageRoute(applicantId);
  const actor: any = await User.findByPk(actorId, { raw: true });
  if (!actor) return { allowed: false as const, error: "Approver account not found." };

  const wantsReject = requestedStatus === "Rejected";
  const wantsApprove = requestedStatus === "Approved" || requestedStatus === params.finalApprovedStatus;
  if (!wantsReject && !wantsApprove) {
    return { allowed: false as const, error: "Only Approve or Reject is allowed at an approval stage." };
  }

  if (isOwnerUser(actor)) {
    return {
      allowed: true as const,
      nextStatus: wantsReject ? "Rejected" : (params.finalApprovedStatus || "Approved"),
      stage: "owner" as const,
      notifyUsers: [],
    };
  }

  if (currentStatus !== RECOMMENDER_PENDING && currentStatus !== "Pending Manager Approval" && currentStatus !== "Pending") {
    return { allowed: false as const, error: "This request is awaiting final Owner approval." };
  }

  const isAssignedRecommender = route.recommenders.some((u: any) => String(u.id) === String(actorId));
  if (!isAssignedRecommender || String(actorId) === String(applicantId)) {
    return { allowed: false as const, error: "Only the applicant's Department Manager can recommend this request." };
  }

  return {
    allowed: true as const,
    nextStatus: wantsReject ? "Rejected" : OWNER_PENDING,
    stage: "recommender" as const,
    notifyUsers: wantsReject ? [] : route.owners,
  };
}
