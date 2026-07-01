import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FAF9F6] p-6 font-sans md:p-10 text-slate-800">
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap" rel="stylesheet" />
      
      {/* Elegant luxury watermarks in the background */}
      <div className="absolute right-[-5%] bottom-[-5%] select-none pointer-events-none text-[#F3EFE9] font-serif text-[24vw] leading-none font-extralight tracking-tighter opacity-70" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
        RS9
      </div>
      <div className="absolute left-[5%] top-[5%] select-none pointer-events-none text-[#F3EFE9] font-serif text-[16vw] leading-none font-extralight tracking-tighter opacity-40" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
        CREATIVE
      </div>

      <div className="relative z-10 w-full max-w-sm md:max-w-4xl">
        <LoginForm callbackUrl="/dashboard" />
      </div>
    </div>
  );
}
