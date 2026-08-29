"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { BellRing, Download, X } from "lucide-react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
  return bytes.buffer;
}

export default function PwaManager() {
  const { status } = useSession();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIosInstall, setIsIosInstall] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    setPushSupported("PushManager" in window && "Notification" in window);
    navigator.serviceWorker.register("/sw.js").catch(error => console.error("Service worker registration failed:", error));
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    setIsIosInstall(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    setPushEnabled("Notification" in window && Notification.permission === "granted");
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  const install = async () => {
    if (isIosInstall) {
      alert("On iPhone/iPad: tap Share, then choose ‘Add to Home Screen’. ");
      return;
    }
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const enablePush = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      const registration = await navigator.serviceWorker.ready;
      const configResponse = await fetch("/api/push-subscriptions", { cache: "no-store" });
      const config = await configResponse.json();
      if (!config.success || !config.publicKey) throw new Error(config.error || "Push notifications are not configured.");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(config.publicKey),
      });
      const response = await fetch("/api/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Subscription failed.");
      setPushEnabled(true);
      alert("Rs9 HRMS notifications are enabled on this device.");
    } catch (error: any) {
      alert(error?.message || "Notifications could not be enabled.");
    }
  };

  const showInstall = Boolean(installPrompt || isIosInstall);
  const showPush = status === "authenticated" && pushSupported && !pushEnabled;
  if (dismissed || (!showInstall && !showPush)) return null;

  return <div className="fixed bottom-4 right-4 z-[10000] flex items-center gap-2 rounded-2xl border border-[#744868]/20 bg-white/95 p-2 shadow-2xl backdrop-blur">
    {showInstall && <button onClick={install} className="flex items-center gap-2 rounded-xl bg-[#744868] px-3 py-2 text-xs font-bold text-white"><Download className="h-4 w-4"/>Install Rs9 HRMS</button>}
    {showPush && <button onClick={enablePush} className="flex items-center gap-2 rounded-xl bg-[#C9A84C] px-3 py-2 text-xs font-bold text-[#241d24]"><BellRing className="h-4 w-4"/>Enable Alerts</button>}
    <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4"/></button>
  </div>;
}
