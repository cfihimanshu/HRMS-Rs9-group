"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Decorative background light circles */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-red-500/5 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-orange-600/5 blur-[120px]" />

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative z-10 text-center">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-8 h-8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
          Access Restricted
        </h1>
        <p className="text-sm text-slate-400 mt-2 px-4 leading-relaxed">
          Your corporate account does not have authorization to view this section. Please contact your administrator.
        </p>

        <button
          onClick={() => router.push("/login")}
          className="w-full mt-8 bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3 text-sm font-semibold transition-all border border-slate-700 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
        >
          Return to Portal Access
        </button>
      </div>
    </div>
  );
}
