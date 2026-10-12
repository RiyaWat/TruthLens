import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { fetchScans } from "@/lib/api";
import { useTranslation } from "react-i18next";
import {
  TextT, ImageSquare, VideoCamera, Link as LinkIcon, ArrowLeft,
} from "@phosphor-icons/react";

const ICONS = { text: TextT, image: ImageSquare, video: VideoCamera, url: LinkIcon };
const COLORS = { HUMAN: "#00FF66", AI: "#FFB800", DEEPFAKE: "#FF3B30", UNCERTAIN: "#A1A1AA" };

export default function HistoryPage() {
  const { t } = useTranslation();
  const [scans, setScans] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => { fetchScans(100).then(setScans).catch(() => {}); }, []);

  const filtered = filter === "all" ? scans : scans.filter(s => s.type === filter);

  const filters = [
    { v: "all", k: "history.filter_all" },
    { v: "text", k: "history.filter_text" },
    { v: "image", k: "history.filter_image" },
    { v: "video", k: "history.filter_video" },
    { v: "url", k: "history.filter_url" },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Header />
      <main className="px-6 lg:px-12 py-12 max-w-5xl mx-auto" data-testid="history-page">
        <Link to="/" className="tl-mono text-xs uppercase tracking-[0.3em] text-white/60 hover:text-[#00E5FF] inline-flex items-center gap-2 mb-8">
          <ArrowLeft size={14} weight="bold" /> back
        </Link>
        <div className="mb-10 max-w-2xl">
          <p className="tl-mono text-xs uppercase tracking-[0.3em] text-[#00E5FF] mb-3">{t("history.label")}</p>
          <h1 className="tl-display text-5xl font-black leading-[0.95]">{t("history.title")}</h1>
          <p className="text-white/65 mt-4">{t("history.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-1 mb-6">
          {filters.map(f => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              data-testid={`history-filter-${f.v}`}
              className={`px-4 py-2 border tl-mono text-[10px] uppercase tracking-[0.25em] transition-colors ${
                filter === f.v
                  ? "border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/5"
                  : "border-white/15 text-white/60 hover:border-white/30"
              }`}
            >
              {t(f.k)}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <p className="tl-mono text-[11px] uppercase tracking-[0.25em] text-white/40 text-center py-16 border border-white/10" data-testid="history-empty">
            {t("history.empty")}
          </p>
        ) : (
          <div className="border border-white/10 divide-y divide-white/5">
            {filtered.map(s => {
              const Icon = ICONS[s.type] || TextT;
              const color = COLORS[s.classification] || "#A1A1AA";
              return (
                <Link
                  key={s.id}
                  to={`/report/${s.id}`}
                  data-testid={`history-row-${s.id}`}
                  className="block px-5 py-4 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <Icon size={16} weight="bold" className="text-white/50 mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="tl-mono text-[9px] uppercase tracking-[0.25em] text-white/50">{s.type}</span>
                        <span className="tl-mono text-[9px] uppercase tracking-[0.25em] font-bold" style={{ color }}>· {s.classification}</span>
                        {s.language && (
                          <span className="tl-mono text-[9px] uppercase tracking-[0.25em] text-white/30">· {s.language}</span>
                        )}
                        <span className="tl-mono text-[9px] text-white/30 ml-auto">{new Date(s.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-white/80 line-clamp-2 break-words">{s.preview || s.summary}</p>
                    </div>
                    <p className="tl-display text-3xl font-black" style={{ color }}>
                      {s.score}<span className="text-xs text-white/30 ml-0.5">%</span>
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
