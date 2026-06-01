"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError("Authentication failed. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      // Direct NextAuth Google signIn trigger
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (err) {
      setError("Google authentication service failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 md:p-10 font-sans relative overflow-hidden">
      {/* Soft background glow circles */}
      <div className="absolute top-[-10%] left-[-10%] w-[35rem] h-[35rem] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-violet-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm md:max-w-4xl relative z-10">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden p-0 border border-slate-200/80 shadow-xl bg-white rounded-3xl">
            <CardContent className="grid p-0 md:grid-cols-2">
              {/* Form panel */}
              <form onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col justify-center">
                <FieldGroup>
                  <div className="flex flex-col items-center gap-2 text-center mb-6">
                    <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-md shadow-indigo-500/10 mb-2">
                      <span className="text-white text-lg font-bold font-serif">A</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">Welcome back</h1>
                    <p className="text-xs text-slate-500">
                      Login to Acolyte HR Master Suite
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3.5 py-2.5 rounded-xl font-semibold mb-4 leading-normal">
                      ⚠️ {error}
                    </div>
                  )}

                  <Field>
                    <FieldLabel htmlFor="email">Email Address</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="cfi.himanshu@gmail.com"
                      className="bg-white border-slate-200 focus-visible:ring-indigo-500/20"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <div className="flex items-center">
                      <FieldLabel htmlFor="password">Password</FieldLabel>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      required
                      placeholder="••••••••"
                      className="bg-white border-slate-200 focus-visible:ring-indigo-500/20"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </Field>

                  <Field className="pt-2">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-xs font-bold transition-all shadow-md shadow-indigo-500/10 active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        "Open CRM Dashboard"
                      )}
                    </Button>
                  </Field>



                  <FieldDescription className="text-center text-[10px] text-slate-400 mt-4">
                    Authorized Personnel Only | System access audited
                  </FieldDescription>
                </FieldGroup>
              </form>

              {/* Cover Graphic Banner */}
              <div className="relative hidden md:block">
                <img
                  src="/login_cover.png"
                  alt="Acolyte Operations Hub"
                  className="absolute inset-0 h-full w-full object-cover rounded-r-3xl brightness-[0.98] contrast-[1.02]"
                />
              </div>
            </CardContent>
          </Card>
          <FieldDescription className="px-6 text-center text-[10px] text-slate-400">
            By accessing this console, you agree to Acolyte Group&apos;s <a href="#" className="underline">Terms of Service</a> and <a href="#" className="underline">Privacy Policy</a>.
          </FieldDescription>
        </div>
      </div>
    </div>
  );
}
