import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { Op } from "sequelize";
import { requireApiSession } from "@/lib/apiAuth";
import DocumentRegister from "@/models/sequelize/DocumentRegister";
import Notification from "@/models/sequelize/Notification";
import User from "@/models/sequelize/User";
import { sendEmail } from "@/lib/email";

const ALERT_ROLES = ["Owner", "Director", "HR Head", "HR Executive"] as const;
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character] || character));

export async function POST() {
  try {
    const auth = await requireApiSession(ALERT_ROLES);
    if (auth.response) return auth.response;
    const today = new Date().toISOString().slice(0, 10);
    const inThirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const documents = await DocumentRegister.findAll({
      where: {
        [Op.or]: [
          { dueDate: { [Op.lt]: today }, status: { [Op.in]: ["In Custody", "Handed Over", "Pending Acceptance"] } },
          { expiryDate: { [Op.between]: [today, inThirtyDays] } },
        ],
      },
    });
    let created = 0;
    for (const document of documents) {
      const recipient = document.pendingHolderId || document.currentHolderId;
      if (!recipient) continue;
      const overdue = document.dueDate && String(document.dueDate) < today;
      const title = overdue ? "Overdue Document" : "Document Expiry Reminder";
      const key = `[${document.documentNumber}:${today}]`;
      const existing = await Notification.findOne({
        where: { recipient, title, message: { [Op.like]: `%${key}%` } },
      });
      if (existing) continue;
      await Notification.create({
        id: randomUUID(), recipient, title,
        message: `${key} ${document.title} ${overdue ? `was due on ${document.dueDate}` : `expires on ${document.expiryDate}`}.`,
        read: false,
      });
      const recipientUser = await User.findByPk(recipient, { attributes: ["email"], raw: true });
      if ((recipientUser as any)?.email) {
        void sendEmail({
          to: String((recipientUser as any).email),
          subject: title,
          html: `<div style="font-family:Arial,sans-serif"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(document.documentNumber)} — ${escapeHtml(document.title)}</p><p>${overdue ? `Due date: ${escapeHtml(document.dueDate)}` : `Expiry date: ${escapeHtml(document.expiryDate)}`}</p></div>`,
        });
      }
      created += 1;
    }
    return NextResponse.json({ success: true, scanned: documents.length, notificationsCreated: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Alert scan failed" }, { status: 500 });
  }
}
