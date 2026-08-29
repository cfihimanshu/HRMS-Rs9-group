import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import PwaManager from "@/components/PwaManager";

export const metadata: Metadata = {
  title: "Rs9 HRMS",
  description: "Enterprise HR Automation Suite for RS9 Group of Companies",
  applicationName: "Rs9 HRMS",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Rs9 HRMS" },
  icons: {
    icon: [{ url: "/icons/rs9-hrms-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#FAFAF7] text-[#1C1C1A] min-h-screen font-sans">
        <Providers>
          <TooltipProvider>
            {children}
            <PwaManager />
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
