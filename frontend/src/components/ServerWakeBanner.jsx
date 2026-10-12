import React, { useEffect, useState } from "react";
import { CircleNotch } from "@phosphor-icons/react";
import { isServerWaking } from "@/lib/api";

// The free backend sleeps when idle; the first request after that takes ~30 s
// while it boots. Say so instead of looking broken.
export default function ServerWakeBanner() {
  const [waking, setWaking] = useState(isServerWaking());

  useEffect(() => {
    const on = () => setWaking(true);
    const off = () => setWaking(false);
    window.addEventListener("truthlens:waking", on);
    window.addEventListener("truthlens:awake", off);
    return () => {
      window.removeEventListener("truthlens:waking", on);
      window.removeEventListener("truthlens:awake", off);
    };
  }, []);

  if (!waking) return null;
  return (
    <div
      role="status"
      data-testid="server-wake-banner"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md border border-[#00E5FF]/40 bg-[#0A0A0A]/95 backdrop-blur px-4 py-3 flex items-center gap-3 shadow-lg"
    >
      <CircleNotch size={18} weight="bold" className="animate-spin text-[#00E5FF] shrink-0" />
      <p className="text-sm text-white/85 leading-snug">
        Waking up the server (~30s). It sleeps when idle on the free plan; hang tight, it'll retry automatically.
      </p>
    </div>
  );
}
