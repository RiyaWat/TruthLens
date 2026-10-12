import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchScans } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { TextT, ImageSquare, VideoCamera, Link as LinkIcon } from "@phosphor-icons/react";

const ICONS = { text: TextT, image: ImageSquare, video: VideoCamera, url: LinkIcon };
const COLOR = { HUMAN: "#00FF66", AI: "#FFB800", DEEPFAKE: "#FF3B30", UNCERTAIN: "#A1A1AA" };

export default function RecentScans() {
  const { t } = useTranslation();
  const [scans, setScans] = useState([]);

  const refresh = () => fetchScans(10).then(setScans).catch(() => {});

  useEffect(() => {
    refresh();
    const onNew = () => refresh();
    window.addEventListener("tl-new-scan", onNew);
    return () => window.removeEventListener("tl-new-scan", onNew);
  }, []);

  return (
    <div data-testid="recent-scans" className="border border-white/10 bg-[#0E0E0E] h-full">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <p className="tl-mono text-[11px] uppercase tracking-[0.25em] text-white/70">{t("recent.title")}</p>
        <span className="tl-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          {scans.length}
        </span>
      </div>
      <div className="divide-y divide-white/5 max-h-[520px] overflow-y-auto">
        {scans.length === 0 && (
          <p className="tl-mono text-[11px] uppercase tracking-[0.2em] text-white/40 px-5 py-10 text-center">
            {t("recent.empty")}
          </p>
        )}
        {scans.map((s) => {
          const Icon = ICONS[s.type] || TextT;
          const color = COLOR[s.classification] || "#A1A1AA";
          return (
            <Link
              key={s.id}
              to={`/report/${s.id}`}
              data-testid={`recent-scan-${s.id}`}
              className="block px-5 py-4 hover:bg-white/[0.03] group transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon size={12} weight="bold" className="text-white/50" />
                    <span className="tl-mono text-[9px] uppercase tracking-[0.25em] text-white/40">
                      {s.type}
                    </span>
                    <span
                      className="tl-mono text-[9px] uppercase tracking-[0.25em] font-bold"
                      style={{ color }}
                    >
                      · {s.classification}
                    </span>
                  </div>
                  <p className="text-xs text-white/75 line-clamp-2 break-words group-hover:text-white">
                    {s.preview || s.summary}
                  </p>
                </div>
                <div className="text-right">
                  <p className="tl-display text-2xl font-black" style={{ color }}>
                    {s.score}
                    <span className="text-xs text-white/30 ml-0.5">%</span>
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
