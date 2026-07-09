"use client";

import React, { useEffect, useState } from "react";

export function LoginSplash() {
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Start fade out after 2 seconds
    const timer1 = setTimeout(() => {
      setFadeOut(true);
    }, 2000);

    // Remove from DOM after 2.8 seconds (giving 800ms for the fade out transition)
    const timer2 = setTimeout(() => {
      setShow(false);
    }, 2800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#FCFBF9] transition-opacity duration-1000 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&display=swap" rel="stylesheet" />
      
      <div className="flex flex-col items-center">
        {/* Animated Line Top */}
        <div className="h-[1px] bg-[#C9A84C] animate-[expandWidth_1.5s_ease-out_forwards]" style={{ width: "0%" }}></div>
        
        <div className="py-6 overflow-hidden flex flex-col items-center justify-center">
          <div className="text-6xl md:text-8xl font-light tracking-[0.2em] text-[#1C1C1A] font-serif uppercase animate-[slideUpFade_1s_ease-out_forwards]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            RS9
          </div>
          <div className="text-[10px] md:text-xs font-bold tracking-[0.4em] text-[#C9A84C] uppercase mt-4 animate-[slideUpFade_1s_ease-out_0.3s_both]">
            Group
          </div>
        </div>

        {/* Animated Line Bottom */}
        <div className="h-[1px] bg-[#C9A84C] animate-[expandWidth_1.5s_ease-out_forwards]" style={{ width: "0%" }}></div>
      </div>

      <style jsx global>{`
        @keyframes expandWidth {
          0% { width: 0%; opacity: 0; }
          100% { width: 120px; opacity: 1; }
        }
        @keyframes slideUpFade {
          0% { transform: translateY(30px); opacity: 0; filter: blur(4px); }
          100% { transform: translateY(0); opacity: 1; filter: blur(0); }
        }
      `}</style>
    </div>
  );
}
