import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sequelize from "@/lib/sequelize";
import AbsentFine from "@/models/sequelize/AbsentFine";
import User from "@/models/sequelize/User";
import { Op } from "sequelize";
import { sendEmail } from "@/lib/email";

import { logHRActivity } from "@/lib/hrAudit";

// GET: Fetch fines for an employee (or all if manager/HR)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    await sequelize.authenticate();
    await AbsentFine.sync({ alter: true });

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    const canViewAll = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"].includes(userRole);

    let where: any = {};
    if (canViewAll && employeeId) {
      where.employee = employeeId;
    } else if (!canViewAll) {
      where.employee = userId;
    }

    const fines = await AbsentFine.findAll({
      where,
      order: [["date", "DESC"]],
      raw: true,
    });

    // Populate employee and imposedBy user names
    const userIds = [...new Set([
      ...fines.map((f: any) => f.employee),
      ...fines.map((f: any) => f.imposedBy),
    ].filter(Boolean))];

    let userMap: any = {};
    if (userIds.length > 0) {
      const users = await User.findAll({ where: { id: { [Op.in]: userIds } }, raw: true });
      users.forEach((u: any) => { userMap[u.id] = { name: u.name, role: u.role, email: u.email }; });
    }

    const result = fines.map((f: any) => ({
      ...f,
      employeeInfo: userMap[f.employee] || null,
      imposedByInfo: userMap[f.imposedBy] || null,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[/api/fines GET]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Impose a fine on an employee
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const imposedBy = (session.user as any).id;

    const canImpose = ["Owner", "Director", "HR Head", "HR Executive", "Department Manager"].includes(userRole);
    if (!canImpose) {
      return NextResponse.json({ success: false, error: "Only managers and HR can impose fines" }, { status: 403 });
    }

    await sequelize.authenticate();
    await AbsentFine.sync({ alter: true });

    const body = await req.json();
    const { employeeId, date, fromDate, toDate, amount = 500, reason } = body;

    const startDateStr = fromDate || date;
    const endDateStr = toDate || date;

    if (!employeeId || !startDateStr) {
      return NextResponse.json({ success: false, error: "Employee and date range are required" }, { status: 400 });
    }

    // Generate list of dates between startDateStr and endDateStr
    const datesList: string[] = [];
    const curr = new Date(startDateStr);
    const last = new Date(endDateStr || startDateStr);

    while (curr <= last) {
      datesList.push(curr.toISOString().split("T")[0]);
      curr.setDate(curr.getDate() + 1);
    }

    if (datesList.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid date range selected" }, { status: 400 });
    }

    const perDayAmount = Number(amount) || 500;
    const fineReasonText = reason ? reason.trim() : "Absent without prior notification";
    const createdFines: any[] = [];

    for (const d of datesList) {
      const existing = await AbsentFine.findOne({ where: { employee: employeeId, date: d } });
      if (!existing) {
        const fine = await AbsentFine.create({
          id: Date.now().toString() + "_" + Math.random().toString(36).substring(2, 7),
          employee: employeeId,
          date: d,
          amount: perDayAmount,
          reason: fineReasonText,
          imposedBy,
          imposedAt: new Date(),
        });
        createdFines.push(fine);
      }
    }

    const totalAmount = perDayAmount * datesList.length;
    const empUserForAudit = await User.findByPk(employeeId, { raw: true });

    await logHRActivity({
      userId: imposedBy,
      userRole,
      action: "FINE_IMPOSED",
      details: `Fine of ₹${perDayAmount}/day (Total ₹${totalAmount} for ${datesList.length} days) imposed on ${empUserForAudit?.name || "employee"} for range ${startDateStr} to ${endDateStr}. Reason: ${fineReasonText}.`,
    });

    // Send detailed email notification to employee
    try {
      const empUser = await User.findByPk(employeeId, { raw: true });
      if (empUser && empUser.email) {
        const fromFormatted = new Date(startDateStr).toLocaleDateString("en-IN", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric"
        });
        const toFormatted = new Date(endDateStr || startDateStr).toLocaleDateString("en-IN", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric"
        });

        const dateRangeDisplay = datesList.length > 1
          ? `${fromFormatted} to ${toFormatted} (${datesList.length} Days)`
          : `${fromFormatted}`;

        sendEmail({
          to: empUser.email,
          subject: `⚠️ Notice: Absent Fine Imposed (Total ₹${totalAmount.toLocaleString('en-IN')}) - ${dateRangeDisplay}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              <div style="background-color: #dc2626; padding: 20px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 20px; font-weight: bold;">⚠️ Absence Fine Notification</h1>
                <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">RS9 Group HRMS & Management Hub</p>
              </div>
              
              <div style="padding: 24px; background-color: #ffffff; color: #1f2937;">
                <p style="font-size: 15px; margin-top: 0;">Dear <strong>${empUser.name || "Employee"}</strong>,</p>
                <p style="font-size: 14px; line-height: 1.5; color: #4b5563;">
                  This email is to inform you that an absence fine has been imposed on your attendance record due to unauthorized absence or non-compliance.
                </p>

                <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 8px;">
                  <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 6px 0; color: #6b7280; width: 140px;"><strong>Absence Duration:</strong></td>
                      <td style="padding: 6px 0; color: #111827; font-weight: bold;">${dateRangeDisplay}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #6b7280;"><strong>Per Day Rate:</strong></td>
                      <td style="padding: 6px 0; color: #111827; font-weight: bold;">₹${perDayAmount.toLocaleString('en-IN')} / day</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #6b7280;"><strong>Total Days:</strong></td>
                      <td style="padding: 6px 0; color: #111827; font-weight: bold;">${datesList.length} Day(s)</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #6b7280;"><strong>Total Fine Amount:</strong></td>
                      <td style="padding: 6px 0; color: #dc2626; font-weight: bold; font-size: 18px;">₹${totalAmount.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #6b7280;"><strong>Reason for Fine:</strong></td>
                      <td style="padding: 6px 0; color: #111827; font-style: italic;">"${fineReasonText}"</td>
                    </tr>
                  </table>
                </div>

                <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">
                  This fine has been recorded on your Attendance & Payroll record. If you have a valid reason or believe this fine was issued by mistake, please reach out to your Manager or HR Department immediately.
                </p>

                <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center;">
                  RS9 Group HRMS • Automated System Notification
                </div>
              </div>
            </div>
          `
        }).catch(e => console.error("Error sending fine email:", e));
      }
    } catch (emailErr) {
      console.error("Failed to process fine email notification:", emailErr);
    }

    return NextResponse.json({ success: true, count: datesList.length, totalAmount });
  } catch (error: any) {
    console.error("[/api/fines POST]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a fine
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const canManage = ["Owner", "Director", "HR Head"].includes(userRole);
    if (!canManage) {
      return NextResponse.json({ success: false, error: "Only Owner/HR Head can remove fines" }, { status: 403 });
    }

    const body = await req.json();
    const { fineId } = body;
    if (!fineId) {
      return NextResponse.json({ success: false, error: "fineId is required" }, { status: 400 });
    }

    await AbsentFine.destroy({ where: { id: fineId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[/api/fines DELETE]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
