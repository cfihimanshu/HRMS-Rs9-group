import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const escapeHtml = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const formatTime = (value: unknown) => {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = String((session?.user as any)?.role || "").toLowerCase();
    const recipient = String(session?.user?.email || "").trim();

    if (!session?.user || !["owner", "director"].includes(role)) {
      return NextResponse.json({ success: false, error: "Only Owner or Director can send this report." }, { status: 403 });
    }
    if (!recipient) {
      return NextResponse.json({ success: false, error: "No email is configured for the logged-in Owner." }, { status: 400 });
    }

    const body = await req.json();
    const employees = Array.isArray(body.employees) ? body.employees.slice(0, 500) : [];
    const verticals = Array.isArray(body.verticals) ? body.verticals.slice(0, 100) : [];
    const totals = body.totals || {};
    const reportDate = new Date().toLocaleDateString("en-IN", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata"
    });

    const employeeRows = employees.map((employee: any) => {
      const total = Number(employee.tasksTotal || 0);
      const completed = Number(employee.tasksCompleted || 0);
      const pending = Math.max(0, total - completed);
      return `<tr>
        <td style="padding:10px;border-bottom:1px solid #eef0f2"><b>${escapeHtml(employee.name || "Employee")}</b><br><span style="font-size:9px;color:#6b7280">${escapeHtml(employee.department || employee.role || "N/A")}</span></td>
        <td align="center" style="border-bottom:1px solid #eef0f2">${formatTime(employee.sodTime)}</td>
        <td align="center" style="border-bottom:1px solid #eef0f2">${formatTime(employee.eodTime)}</td>
        <td align="center" style="border-bottom:1px solid #eef0f2;color:#047857;font-weight:700">${completed}</td>
        <td align="center" style="border-bottom:1px solid #eef0f2;color:#b45309;font-weight:700">${pending}</td>
      </tr>`;
    }).join("");

    const verticalRows = verticals.map((group: any) => {
      const tasks = Array.isArray(group.tasks) ? group.tasks : [];
      const items = tasks.map((task: any) =>
        `<li style="margin:5px 0">${escapeHtml(task.title || "Untitled work")} — ${escapeHtml(task.employee || "Team Member")} <b style="color:${task.completed ? "#047857" : "#b45309"}">(${escapeHtml(task.status || "Pending")})</b></li>`
      ).join("");
      return `<div style="margin-bottom:9px;padding:11px 13px;background:#f9fafb;border-left:3px solid #4f46e5;border-radius:7px">
        <b style="font-size:11px;color:#3730a3">${escapeHtml(group.name || "Other Work")} (${tasks.length})</b>
        <ul style="font-size:10px;color:#4b5563;line-height:15px;margin:6px 0 0;padding-left:17px">${items}</ul>
      </div>`;
    }).join("");

    const html = `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Arial,sans-serif;color:#202124">
      <table width="100%" cellspacing="0" cellpadding="0" style="background:#f4f5f7"><tr><td align="center" style="padding:25px 10px">
      <table width="680" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;background:white;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb">
        <tr><td style="padding:24px 28px;background:#312e81;color:white"><div style="font-size:10px;letter-spacing:2px;color:#c7d2fe;font-weight:bold">RS9 GROUP HRMS</div><div style="font-size:23px;font-weight:bold;margin-top:6px">Daily Workforce Report</div><div style="font-size:12px;color:#e0e7ff;margin-top:6px">${escapeHtml(reportDate)} • Sent manually by Owner</div></td></tr>
        <tr><td style="padding:20px 24px 8px"><table width="100%"><tr>
          <td align="center" style="padding:10px;background:#eef2ff"><b style="font-size:20px;color:#4338ca">${Number(totals.total || 0)}</b><br><span style="font-size:8px">TOTAL TASKS</span></td>
          <td width="6"></td><td align="center" style="padding:10px;background:#ecfdf5"><b style="font-size:20px;color:#047857">${Number(totals.completed || 0)}</b><br><span style="font-size:8px">COMPLETED</span></td>
          <td width="6"></td><td align="center" style="padding:10px;background:#fffbeb"><b style="font-size:20px;color:#b45309">${Number(totals.pending || 0)}</b><br><span style="font-size:8px">PENDING</span></td>
        </tr></table></td></tr>
        <tr><td style="padding:16px 24px"><div style="font-size:11px;font-weight:bold;letter-spacing:1px;margin-bottom:9px">EMPLOYEE ATTENDANCE & TASKS</div>
          <table width="100%" cellspacing="0" cellpadding="0" style="font-size:10px;border:1px solid #e5e7eb"><tr style="background:#f9fafb;color:#6b7280"><th align="left" style="padding:9px">EMPLOYEE</th><th>IN</th><th>OUT</th><th>DONE</th><th>PENDING</th></tr>${employeeRows || `<tr><td colspan="5" align="center" style="padding:18px;color:#6b7280">No employee data available.</td></tr>`}</table>
        </td></tr>
        <tr><td style="padding:4px 24px 22px"><div style="font-size:11px;font-weight:bold;letter-spacing:1px;margin-bottom:9px">TODAY'S WORK BY VERTICAL</div>${verticalRows || `<div style="font-size:10px;color:#6b7280">No work entries available for today.</div>`}</td></tr>
        <tr><td align="center" style="padding:14px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af">Automated report generated by RS9 Group HRMS.</td></tr>
      </table></td></tr></table></body></html>`;

    const result = await sendEmail({
      to: recipient,
      subject: `Daily Workforce Report — ${reportDate}`,
      html
    });

    if (!(result as any)?.success) {
      return NextResponse.json({ success: false, error: (result as any)?.error || "Email could not be sent." }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: `Report sent to ${recipient}` });
  } catch (error: any) {
    console.error("Daily owner report email error:", error);
    return NextResponse.json({ success: false, error: error?.message || "Email could not be sent." }, { status: 500 });
  }
}
