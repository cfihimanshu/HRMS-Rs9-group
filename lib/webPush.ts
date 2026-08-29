import webpush from "web-push";
import WebPushSubscription from "@/models/sequelize/WebPushSubscription";

function configured() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@cfi247.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function sendWebPushToUser(userId: string, payload: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}) {
  if (!userId || !configured()) return;
  const subscriptions: any[] = await WebPushSubscription.findAll({ where: { userId }, raw: true });
  await Promise.allSettled(subscriptions.map(async subscription => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, JSON.stringify(payload));
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await WebPushSubscription.destroy({ where: { id: subscription.id } });
      } else {
        console.error("Web push delivery failed:", error?.message || error);
      }
    }
  }));
}
