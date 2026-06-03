import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-6 font-sans md:p-10">
      {/* Soft background glow circles */}
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[35rem] w-[35rem] rounded-full bg-indigo-500/5 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[35rem] w-[35rem] rounded-full bg-violet-500/5 blur-[120px]" />

      <div className="relative z-10 w-full max-w-sm md:max-w-4xl">
        <LoginForm callbackUrl="/dashboard" />
      </div>
    </div>
  );
}
