import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Op } from "sequelize";
import { authOptions } from "@/lib/auth";
import { safeAuthenticate } from "@/lib/sequelize";
import LegalRecoveryMaster from "@/models/sequelize/LegalRecoveryMaster";
import Notification from "@/models/sequelize/Notification";
import User from "@/models/sequelize/User";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const amount = (value: unknown) => Number(String(value ?? 0).replace(/[^0-9.-]/g, "")) || 0;
const money = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;
const safePart = (value: unknown) => String(value || "na").replace(/[^a-zA-Z0-9]/g, "").slice(-32) || "na";
const indiaDateKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

async function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = new URL(request.url).searchParams.get("secret");
  const authorization = request.headers.get("authorization");
  if (secret && (supplied === secret || authorization === `Bearer ${secret}`)) return true;
  const session = await getServerSession(authOptions);
  const role = String((session?.user as any)?.role || "").toLowerCase();
  return role.includes("owner") || role.includes("director");
}

export async function GET(request: Request) {
  try {
    if (!(await isAuthorized(request))) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (!(await safeAuthenticate(8000))) return NextResponse.json({ success: false, error: "Database unavailable" }, { status: 503 });
    await Notification.sync();

    const [cases, users] = await Promise.all([
      LegalRecoveryMaster.findAll({ where: { pendingAmount: { [Op.gt]: 0 } }, order: [["pendingAmount", "DESC"]], raw: true }),
      User.findAll({ attributes: ["id", "role", "status"], raw: true }),
    ]);
    const owners = users.filter((user: any) => String(user.role || "").toLowerCase().includes("owner") && !["inactive", "disabled", "terminated"].includes(String(user.status || "").toLowerCase()));
    const totalPending = cases.reduce((sum: number, item: any) => sum + amount(item.pendingAmount), 0);
    const bankTotals = new Map<string, { bank: string; amount: number; cases: number }>();
    cases.forEach((item: any) => {
      const bank = String(item.bankName || "Unknown Bank");
      const current = bankTotals.get(bank) || { bank, amount: 0, cases: 0 };
      current.amount += amount(item.pendingAmount); current.cases += 1; bankTotals.set(bank, current);
    });
    const topBanks = [...bankTotals.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);
    const breakup = topBanks.map(item => `${item.bank}: ${money(item.amount)} (${item.cases})`).join(" • ");
    const topBranches = (cases as any[]).slice(0, 5).map(item => `${item.bankName || "Unknown Bank"} / ${item.branchName || "General"}: ${money(amount(item.pendingAmount))}`).join(" • ");
    const dateKey = indiaDateKey();
    let created = 0;

    for (const owner of owners as any[]) {
      const id = `legal_pending_8pm_${safePart(dateKey)}_${safePart(owner.id)}`;
      const [, wasCreated] = await Notification.findOrCreate({
        where: { id },
        defaults: {
          id,
          recipient: String(owner.id),
          title: `Daily Legal Recovery Pending: ${money(totalPending)}`,
          message: cases.length
            ? `${cases.length} bank case(s) have ${money(totalPending)} remaining. Bank totals: ${breakup}. Highest pending branches: ${topBranches}.`
            : "All Legal Recovery bank case pending amounts are clear.",
          read: false,
        },
      });
      if (wasCreated) created += 1;
    }

    return NextResponse.json({ success: true, date: dateKey, pendingCases: cases.length, totalPending, owners: owners.length, notificationsCreated: created, topBanks });
  } catch (error: any) {
    console.error("[/api/legal-recovery/pending-summary-reminder]", error);
    return NextResponse.json({ success: false, error: error.message || "Pending summary reminder failed" }, { status: 500 });
  }
}
