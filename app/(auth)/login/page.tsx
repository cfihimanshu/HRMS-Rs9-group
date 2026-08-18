import { LoginForm } from "@/components/login-form";

// Keep the login route independently compilable after development asset refreshes.
export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f1eee8] px-4 py-8 font-sans text-slate-800 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#d7c993]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-[#899d8f]/15 blur-3xl" />
      <div className="relative z-10 w-full max-w-5xl">
        <LoginForm callbackUrl="/dashboard" />
      </div>
    </div>
  );
}
