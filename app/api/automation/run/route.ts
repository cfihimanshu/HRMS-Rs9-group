import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type AutomationJob = {
  key: string;
  label: string;
  path: string;
  method?: "GET" | "POST";
};

const AUTOMATION_JOBS: AutomationJob[] = [
  { key: "task_followups", label: "Task follow-up email reminders", path: "/api/tasks/remind" },
  { key: "overdue_tasks", label: "Overdue task dashboard reminders", path: "/api/tasks/incomplete-reminders" },
  { key: "owner_digest", label: "Owner operations digest", path: "/api/notifications/owner-digest" },
  { key: "legal_pending", label: "Legal recovery pending summary", path: "/api/legal-recovery/pending-summary-reminder" },
  { key: "document_alerts", label: "Document due and expiry alerts", path: "/api/document-movement/alerts", method: "POST" },
];

async function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = new URL(request.url).searchParams.get("secret");
  if (secret && (supplied === secret || request.headers.get("authorization") === `Bearer ${secret}`)) return true;

  const session: any = await getServerSession(authOptions);
  const role = String(session?.user?.role || "").toLowerCase();
  return /owner|director/.test(role);
}

function getBaseUrl(request: Request) {
  const configured = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

async function runJob(baseUrl: string, job: AutomationJob) {
  const url = new URL(job.path, baseUrl);
  if (process.env.CRON_SECRET) url.searchParams.set("secret", process.env.CRON_SECRET);

  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method: job.method || "GET",
      cache: "no-store",
      headers: process.env.CRON_SECRET ? { authorization: `Bearer ${process.env.CRON_SECRET}` } : {},
    });
    const data = await response.json().catch(() => null);
    return {
      key: job.key,
      label: job.label,
      success: response.ok && data?.success !== false,
      status: response.status,
      durationMs: Date.now() - startedAt,
      data,
    };
  } catch (error: any) {
    return {
      key: job.key,
      label: job.label,
      success: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      error: error?.message || "Automation job failed",
    };
  }
}

async function runAutomations(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = getBaseUrl(request);
  const results = [];
  for (const job of AUTOMATION_JOBS) {
    results.push(await runJob(baseUrl, job));
  }

  return NextResponse.json({
    success: results.every(result => result.success),
    ranAt: new Date().toISOString(),
    jobs: results,
  }, { status: results.every(result => result.success) ? 200 : 207 });
}

export async function GET(request: Request) {
  return runAutomations(request);
}

export async function POST(request: Request) {
  return runAutomations(request);
}
