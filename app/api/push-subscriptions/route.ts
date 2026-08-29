import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import WebPushSubscription from "@/models/sequelize/WebPushSubscription";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  return NextResponse.json({ success: Boolean(publicKey), publicKey, error: publicKey ? undefined : "Push notifications are not configured." });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = String((session?.user as any)?.id || "");
  if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const subscription = await request.json();
  const endpoint = String(subscription?.endpoint || "");
  const p256dh = String(subscription?.keys?.p256dh || "");
  const auth = String(subscription?.keys?.auth || "");
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ success: false, error: "Invalid push subscription." }, { status: 400 });
  }

  await WebPushSubscription.sync();
  const id = createHash("sha256").update(endpoint).digest("hex").slice(0, 64);
  await WebPushSubscription.upsert({
    id,
    userId,
    endpoint,
    p256dh,
    auth,
    userAgent: request.headers.get("user-agent") || null,
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = String((session?.user as any)?.id || "");
  if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const { endpoint } = await request.json();
  if (endpoint) {
    const id = createHash("sha256").update(String(endpoint)).digest("hex").slice(0, 64);
    await WebPushSubscription.destroy({ where: { id, userId } });
  }
  return NextResponse.json({ success: true });
}
