import React, { useEffect, useState } from "react";

const LoadingScreen = ({ isExiting, onExited }) => {
  const [mounted, setMounted] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    if (isExiting) {
      setFade(true);
      const timer = setTimeout(() => {
        setMounted(false);
        if (onExited) onExited();
      }, 500); // matches transition-opacity duration-500
      return () => clearTimeout(timer);
    }
  }, [isExiting, onExited]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0C0C0B] transition-opacity duration-500 ease-in-out ${
        fade ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="text-2xl font-bold tracking-[0.2em] text-[#F2F1EE] uppercase select-none animate-pulse-subtle">
          Ascend
        </div>
        <div className="relative w-32 h-[2px] bg-[#1A1A18] overflow-hidden rounded-full">
          <div 
            className="absolute top-0 bottom-0 left-0 w-1/2 bg-[#2563EB] rounded-full animate-loader-slide"
            style={{ boxShadow: "0 0 12px 2px rgba(37, 99, 235, 0.6)" }}
          />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
