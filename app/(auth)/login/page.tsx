import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="dark relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6 font-sans md:p-10 text-slate-100">
      {/* Dynamic background glow circles */}
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[40rem] w-[40rem] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse duration-10000" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[40rem] w-[40rem] rounded-full bg-violet-600/20 blur-[120px] animate-pulse duration-10000" />
      <div className="pointer-events-none absolute top-[20%] left-[20%] h-[20rem] w-[20rem] rounded-full bg-fuchsia-600/10 blur-[100px]" />

      <div className="relative z-10 w-full max-w-sm md:max-w-4xl drop-shadow-2xl">
        <LoginForm callbackUrl="/dashboard" />
      </div>
    </div>
  );
}
