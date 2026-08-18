"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoginFormProps extends React.ComponentProps<"div"> {
  callbackUrl?: string;
}

export function LoginForm({ className, callbackUrl = "/dashboard", ...props }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        loginType: "password",
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Authentication failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "grid min-h-[600px] w-full overflow-hidden rounded-[28px] border border-[#e6e0d7] bg-white shadow-[0_24px_80px_rgba(46,38,25,0.12)] lg:grid-cols-[1.05fr_1fr]",
        className,
      )}
      {...props}
    >
      <aside className="relative hidden overflow-hidden bg-[#202823] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10" />
        <div className="absolute -right-8 -top-8 h-80 w-80 rounded-full border border-white/10" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#c9a84c]/10 blur-2xl" />

        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-[#d6b85d]/40 bg-[#d6b85d]/10 font-serif text-xl text-[#e1c66f]">R</div>
          <div>
            <p className="font-serif text-xl tracking-[0.12em]">RS9 GROUP</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.26em] text-white/50">Human Resource Management</p>
          </div>
        </div>

        <div className="relative max-w-sm">
          <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#d6b85d]">Employee workspace</p>
          <h1 className="font-serif text-4xl font-normal leading-[1.15] tracking-tight">Everything your team needs, in one place.</h1>
          <p className="mt-5 max-w-xs text-sm leading-7 text-white/55">Access attendance, leave, payroll and everyday work updates from your secure workspace.</p>
        </div>

        <div className="relative flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
          <span className="h-px w-9 bg-[#d6b85d]/60" />
          People · Performance · Progress
        </div>
      </aside>

      <main className="flex items-center bg-[#fffdfa] px-6 py-10 sm:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-9 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#202823] font-serif text-lg text-[#e1c66f]">R</div>
              <div>
                <p className="font-serif text-lg tracking-[0.12em] text-[#202823]">RS9 GROUP</p>
                <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-[#8a8175]">HR Management</p>
              </div>
            </div>
          </div>

          <header className="mb-8">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#b28f2f]">Welcome back</p>
            <h2 className="font-serif text-3xl text-[#202823]">Sign in to your account</h2>
            <p className="mt-2 text-sm text-[#81796e]">Enter your registered work credentials to continue.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div role="alert" aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-semibold text-[#3d3933]">Work email</label>
              <div className="relative">
                <Mail aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a49b8e]" />
                <input id="email" name="email" type="email" autoComplete="username" placeholder="name@company.com" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading} className="h-12 w-full rounded-xl border border-[#ddd6cc] bg-white pl-10 pr-4 text-sm text-[#202823] outline-none transition placeholder:text-[#b7afa4] hover:border-[#c9bda9] focus:border-[#b28f2f] focus:ring-4 focus:ring-[#c9a84c]/10 disabled:cursor-not-allowed disabled:opacity-60" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-semibold text-[#3d3933]">Password</label>
                <button type="button" onClick={() => alert("Please contact your HR administrator to reset your password.")} className="text-[11px] font-semibold text-[#a38128] transition hover:text-[#7e611b] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]">Forgot password?</button>
              </div>
              <div className="relative">
                <LockKeyhole aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a49b8e]" />
                <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} className="h-12 w-full rounded-xl border border-[#ddd6cc] bg-white pl-10 pr-12 text-sm text-[#202823] outline-none transition placeholder:text-[#b7afa4] hover:border-[#c9bda9] focus:border-[#b28f2f] focus:ring-4 focus:ring-[#c9a84c]/10 disabled:cursor-not-allowed disabled:opacity-60" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[#8e867a] transition hover:bg-[#f4f0e9] hover:text-[#202823] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#202823] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(32,40,35,0.18)] transition hover:-translate-y-0.5 hover:bg-[#2c3831] hover:shadow-[0_14px_30px_rgba(32,40,35,0.22)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#202823]/20 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0">
              {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" /> Signing in...</> : <>Sign in securely <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>}
            </button>
          </form>

          <p className="mt-8 text-center text-[11px] leading-5 text-[#948b7f]">Having trouble signing in? Contact your HR administrator.</p>
        </div>
      </main>
    </div>
  );
}
