"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoginFormProps extends React.ComponentProps<"div"> {
  callbackUrl?: string;
}

export function LoginForm({
  className,
  callbackUrl = "/dashboard",
  ...props
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        loginType: "password",
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Authentication failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className={cn("w-full max-w-4xl mx-auto overflow-hidden bg-[#FCFBF9] border border-[#E8E4DF] shadow-[0_2px_20px_rgba(0,0,0,0.06)] rounded-xl grid md:grid-cols-2 min-h-[550px]", className)} {...props}>
      
      {/* Left Panel - Editorial Branding */}
      <div className="hidden md:flex bg-[#FAFAF7] p-12 flex-col justify-between border-r border-[#E8E4DF] relative overflow-hidden">
        {/* Subtle geometric background graphic */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center">
          <svg className="w-[150%] h-[150%] text-[#1C1C1A]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5">
            <circle cx="50" cy="50" r="45" />
            <circle cx="50" cy="50" r="35" />
            <circle cx="50" cy="50" r="25" />
            <path d="M0,50 L100,50" />
            <path d="M50,0 L50,100" />
          </svg>
        </div>
        
        <div className="relative z-10">
          <div className="text-3xl font-light tracking-widest text-[#1C1C1A] font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
            RS9
          </div>
          <div className="text-[10px] font-bold tracking-[0.25em] text-[#C9A84C] uppercase mt-3">
            People. Performance. Progress.
          </div>
        </div>

        <div className="my-8 relative z-10">
          <svg className="w-full max-w-[260px] mx-auto text-[#E8E4DF]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.75">
            <circle cx="50" cy="50" r="40" strokeDasharray="3,3" />
            <path d="M20,50 C20,30 35,20 50,20 C65,20 80,30 80,50" />
            <path d="M20,50 C20,70 35,80 50,80 C65,80 80,70 80,50" strokeDasharray="1,1" />
            <line x1="50" y1="10" x2="50" y2="90" strokeWidth="0.5" />
            <line x1="10" y1="50" x2="90" y2="50" strokeWidth="0.5" />
          </svg>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-[#9C9890] tracking-wide leading-relaxed font-sans">
            Enterprise Workforce Orchestration Suite.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="p-8 md:p-12 flex flex-col justify-center bg-[#FCFBF9]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1 mb-8">
            <h2 className="text-2xl font-light tracking-wide text-[#1C1C1A] font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
              Sign in
            </h2>
            <p className="text-[11px] text-[#9C9890] uppercase tracking-wider">
              Enter your corporate credentials
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-150 bg-red-50/50 px-3.5 py-2.5 text-xs font-medium text-red-700"
            >
              {error}
            </div>
          )}

          {/* Email Field with Floating Label */}
          <div className="relative">
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              disabled={loading}
              className="peer w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 pt-6 pb-2 text-sm text-[#1C1C1A] transition-all duration-200 focus:outline-none"
            />
            <label
              htmlFor="email"
              className={cn(
                "absolute left-3 transition-all duration-200 pointer-events-none uppercase tracking-wider text-[9px] font-semibold",
                emailFocused || email
                  ? "top-1.5 text-[#C9A84C]"
                  : "top-4.5 text-[#9C9890]"
              )}
            >
              Email Address
            </label>
          </div>

          {/* Password Field with Floating Label */}
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              disabled={loading}
              className="peer w-full bg-[#FCFBF9] border border-[#E8E4DF] focus:border-[#C9A84C] rounded-lg px-3 pt-6 pb-2 pr-10 text-sm text-[#1C1C1A] transition-all duration-200 focus:outline-none"
            />
            <label
              htmlFor="password"
              className={cn(
                "absolute left-3 transition-all duration-200 pointer-events-none uppercase tracking-wider text-[9px] font-semibold",
                passwordFocused || password
                  ? "top-1.5 text-[#C9A84C]"
                  : "top-4.5 text-[#9C9890]"
              )}
            >
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9C9890] hover:text-[#C9A84C] transition-colors focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center justify-end">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert("Please contact your IT Administrator (HR) to reset your password.");
              }}
              className="text-[10px] uppercase tracking-widest text-[#9C9890] hover:text-[#C9A84C] transition-colors font-bold"
            >
              Forgot password?
            </a>
          </div>

          <div className="space-y-4 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C9A84C] hover:bg-[#B3923E] text-white tracking-widest uppercase font-semibold shadow-[0_2px_20px_rgba(201,168,76,0.15)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-250 rounded-lg py-3 text-[10px]"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E8E4DF]"></div>
              </div>
              <div className="relative flex justify-center text-[9px]">
                <span className="bg-[#FCFBF9] px-2 text-[#9C9890] uppercase tracking-widest">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => alert("Google sign-in is disabled for security.")}
              className="w-full border border-[#E8E4DF] bg-transparent text-[#1C1C1A] hover:bg-[#F5F0EA] tracking-widest uppercase font-semibold transition-all duration-200 rounded-lg py-3 text-[9px] flex items-center justify-center gap-2"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 15.01 1 12 1 7.35 1 3.4 3.65 1.54 7.54l3.85 2.99C6.27 7.22 8.91 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.02 3.67-5.01 3.67-8.64z" />
                <path fill="#FBBC05" d="M5.39 14.53c-.25-.74-.39-1.53-.39-2.35s.14-1.61.39-2.35L1.54 6.84C.56 8.8.01 11 .01 12.18c0 1.18.55 3.38 1.53 5.34l3.85-2.99z" />
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.76-2.91c-1.1.74-2.5 1.18-4.2 1.18-3.09 0-5.73-2.18-6.61-5.49l-3.85 2.99C3.4 20.35 7.35 23 12 23z" />
              </svg>
              Continue with Google
            </button>
          </div>
        </form>

        <div className="flex justify-center gap-4 mt-8 text-[9px] tracking-widest uppercase text-[#9C9890] font-semibold">
          <a href="#" className="hover:text-[#C9A84C] transition-colors">Terms</a>
          <span>·</span>
          <a href="#" className="hover:text-[#C9A84C] transition-colors">Privacy</a>
        </div>
      </div>
      
    </div>
  );
}

