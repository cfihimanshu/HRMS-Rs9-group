"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider
    refetchInterval={6 * 60 * 60}
    refetchOnWindowFocus
  >{children}</SessionProvider>;
}
