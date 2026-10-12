import React, { useEffect, useState } from "react";
import { fetchUsage } from "@/lib/api";
import { Lightning } from "@phosphor-icons/react";

export default function UsageBadge({ kind = "text", className = "" }) {
  const [usage, setUsage] = useState(null);

  const refresh = () => fetchUsage().then(setUsage).catch(() => {});

  useEffect(() => {
    refresh();
    const onScan = () => refresh();
    window.addEventListener("tl-new-scan", onScan);
    const t = setInterval(refresh, 30000);
    return () => { window.removeEventListener("tl-new-scan", onScan); clearInterval(t); };
  }, []);

  if (!usage || usage._disabled || !usage[kind]) return null;
  const u = usage[kind];
  // colour escalates as user approaches the cap
  const ratio = u.hour_used / u.hour_limit;
  const color = ratio >= 1 ? "#FF3B30" : ratio >= 0.7 ? "#FFB800" : "#00E5FF";

  return (
    <div
      data-testid={`usage-badge-${kind}`}
      className={`inline-flex items-center gap-2 px-3 py-1.5 border tl-mono text-[10px] uppercase tracking-[0.25em] ${className}`}
      style={{ borderColor: color + "55", color }}
      title={`Hourly: ${u.hour_used}/${u.hour_limit} · Daily: ${u.day_used}/${u.day_limit}`}
    >
      <Lightning size={11} weight="bold" />
      <span>{u.hour_remaining}/h · {u.day_remaining}/d</span>
    </div>
  );
}
