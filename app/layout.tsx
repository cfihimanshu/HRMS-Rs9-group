import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { TooltipProvider } from "@/components/ui/tooltip";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "RS9 Group - HR Automation System",
  description: "Enterprise HR Automation Suite for RS9 Group of Companies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function handleChunkError() {
                  try {
                    var now = Date.now();
                    var lastReload = sessionStorage.getItem('last_chunk_reload_time');
                    if (lastReload && (now - parseInt(lastReload, 10) < 15000)) {
                      console.error('Bypassing automatic reload to prevent loop. Last reload was less than 15s ago.');
                      return;
                    }
                    sessionStorage.setItem('last_chunk_reload_time', now.toString());
                    console.log('Force reloading page with cache buster to fetch latest build...');
                    var urlObj = new URL(window.location.href);
                    urlObj.searchParams.set('cb', now.toString());
                    window.location.replace(urlObj.toString());
                  } catch (err) {
                    window.location.reload();
                  }
                }

                window.addEventListener('error', function(e) {
                  var target = e.target;
                  var isChunkError = false;
                  if (e.message && (e.message.indexOf('ChunkLoadError') !== -1 || e.message.indexOf('Loading chunk') !== -1)) {
                    isChunkError = true;
                  } else if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
                    var url = target.src || target.href || '';
                    if (url.indexOf('_next/static/chunks/') !== -1) {
                      isChunkError = true;
                    }
                  }
                  if (isChunkError) {
                    console.warn('Chunk load error detected in asset fetch!');
                    handleChunkError();
                  }
                }, true);

                window.addEventListener('unhandledrejection', function(e) {
                  var reason = e.reason || {};
                  var message = reason.message || '';
                  var name = reason.name || '';
                  if (name === 'ChunkLoadError' || message.indexOf('ChunkLoadError') !== -1 || message.indexOf('Loading chunk') !== -1) {
                    console.warn('Chunk load error detected in promise rejection!');
                    handleChunkError();
                  }
                });
              })();
            `
          }}
        />
      </head>
      <body className="antialiased bg-[#FAFAF7] text-[#1C1C1A] min-h-screen font-sans">
        <Providers>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
