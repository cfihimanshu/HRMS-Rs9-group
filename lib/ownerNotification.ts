import { Op } from "sequelize";
import Notification from "@/models/sequelize/Notification";
import User from "@/models/sequelize/User";
import { sendEmail } from "@/lib/email";

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export async function notifyOwners({
  title,
  message,
  moduleName,
  actionUrl = "/dashboard",
  eventId,
}: {
  title: string;
  message: string;
  moduleName: string;
  actionUrl?: string;
  eventId?: string;
}) {
  await Notification.sync();
  const candidates = await User.findAll({
    where: { role: { [Op.or]: [{ [Op.like]: "%Owner%" }, { [Op.like]: "%Director%" }] } },
    attributes: ["id", "name", "email", "status"],
    raw: true,
  }) as any[];
  const owners = candidates.filter((owner) => !["inactive", "disabled", "terminated"].includes(String(owner.status || "active").toLowerCase()));
  const timestamp = Date.now();
  const portalBase = String(process.env.NEXTAUTH_URL || "https://hrms.cfi247.com").replace(/\/$/, "");
  const fullActionUrl = actionUrl.startsWith("http") ? actionUrl : `${portalBase}${actionUrl.startsWith("/") ? actionUrl : `/${actionUrl}`}`;

  const notificationResults = await Promise.allSettled(owners.map((owner, index) => Notification.findOrCreate({
    where: { id: eventId ? `${eventId}_${owner.id}` : `owner_${timestamp}_${index}_${owner.id}` },
    defaults: {
      id: eventId ? `${eventId}_${owner.id}` : `owner_${timestamp}_${index}_${owner.id}`,
      recipient: String(owner.id),
      title,
      message,
      read: false,
    },
  })));

  const notificationFailures = notificationResults.filter((result) => result.status === "rejected");
  const createdCount = notificationResults.reduce((count, result) => result.status === "fulfilled" && Boolean(result.value[1]) ? count + 1 : count, 0);
  const shouldSendEmail = !eventId || createdCount > 0;
  const emails = [...new Set(owners.map((owner) => String(owner.email || "").trim()).filter(Boolean))];
  const emailResult = shouldSendEmail && emails.length ? await sendEmail({
    to: emails,
    subject: `${moduleName} — ${title}`,
    html: `<div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;max-width:680px;margin:auto">
      <h2 style="color:#4338ca">${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
      <p><a href="${escapeHtml(fullActionUrl)}" style="display:inline-block;background:#4338ca;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700">Open ${escapeHtml(moduleName)}</a></p>
      <p style="font-size:12px;color:#64748b">RS9 Group HRMS · Automated notification</p>
    </div>`,
  }) : { success: false, error: "No active owner email found" };

  if (notificationFailures.length) console.error("Owner in-app notification failures:", notificationFailures);
  if (shouldSendEmail && !emailResult.success) console.error("Owner email notification failed:", emailResult.error);

  return {
    owners: owners.length,
    inAppCreated: notificationResults.length - notificationFailures.length,
    emailSent: shouldSendEmail && Boolean(emailResult.success),
  };
}
