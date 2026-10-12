import React, { useEffect, useState } from "react";
import { fetchStats } from "@/lib/api";
import { useTranslation } from "react-i18next";

export default function StatsBar() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ total_scans: 0, deepfakes_detected: 0, ai_flagged: 0, by_type: {} });

  useEffect(() => {
    let alive = true;
    const tick = () => fetchStats().then(s => alive && setStats(s)).catch(() => {});
    tick();
    const t2 = setInterval(tick, 8000);
    return () => { alive = false; clearInterval(t2); };
  }, []);

  const items = [
    { k: t("stats.scans_performed"), v: stats.total_scans, c: "#00E5FF" },
    { k: t("stats.deepfakes_flagged"), v: stats.deepfakes_detected, c: "#FF3B30" },
    { k: t("stats.ai_caught"), v: stats.ai_flagged, c: "#FFB800" },
    { k: t("stats.uptime"), v: "Gemini", c: "#00FF66" },
  ];

  return (
    <section
      data-testid="stats-bar"
      className="border-y border-white/10 bg-[#080808]"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/5">
        {items.map((it, i) => (
          <div key={i} className="px-6 py-6 lg:py-8" data-testid={`stat-cell-${i}`}>
            <p className="tl-mono text-[10px] uppercase tracking-[0.3em] text-white/40">{it.k}</p>
            <p
              className="tl-display text-3xl lg:text-4xl font-black mt-2"
              style={{ color: it.c }}
            >
              {typeof it.v === "number" ? it.v.toLocaleString() : it.v}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
