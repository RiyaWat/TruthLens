import React from "react";
import { DownloadSimple, PuzzlePiece, Terminal } from "@phosphor-icons/react";
import { extensionUrl } from "@/lib/api";
import { useTranslation } from "react-i18next";

export default function ExtensionCTA() {
  const { t } = useTranslation();
  return (
    <section
      id="extension"
      data-testid="extension-cta"
      className="relative px-6 lg:px-12 py-24 border-t border-white/10 overflow-hidden"
    >
      <div className="absolute inset-0 tl-grid-bg tl-grid-fade opacity-25" />
      <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div>
          <p className="tl-mono text-xs uppercase tracking-[0.3em] text-[#00E5FF] mb-3">{t("extension.label")}</p>
          <h2 className="tl-display text-4xl sm:text-5xl lg:text-6xl font-black leading-[0.95]">
            {t("extension.title_1")}<br />
            {t("extension.title_2")}
          </h2>
          <p className="text-white/65 mt-6 max-w-lg leading-relaxed">
            {t("extension.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={extensionUrl}
              data-testid="extension-download-btn"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#00E5FF] hover:bg-white text-black tl-mono text-xs uppercase tracking-[0.25em] font-bold transition-colors"
            >
              <DownloadSimple size={16} weight="bold" /> {t("extension.download")}
            </a>
            <span className="inline-flex items-center gap-2 px-6 py-3.5 border border-white/15 text-white/60 tl-mono text-[11px] uppercase tracking-[0.25em]">
              <PuzzlePiece size={14} weight="bold" /> {t("extension.manifest")}
            </span>
          </div>
          <div className="mt-8 border border-white/10 p-4 bg-black/40 tl-mono text-[11px] text-white/65 space-y-1.5">
            <p className="text-[#00E5FF]">{t("extension.install_title")}</p>
            <p>{t("extension.install_1")}</p>
            <p>{t("extension.install_2")}</p>
            <p>{t("extension.install_3")}</p>
            <p>{t("extension.install_4")}</p>
          </div>
        </div>

        <div className="relative">
          <div className="border border-white/15 bg-[#0A0A0A] aspect-[4/3] relative overflow-hidden">
            <div className="absolute inset-0 tl-grid-bg opacity-50" />
            <div className="absolute top-0 left-0 right-0 border-b border-white/10 bg-black/60 flex items-center gap-1.5 px-3 py-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B30]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFB800]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#00FF66]" />
              <div className="ml-3 flex-1 bg-white/5 border border-white/10 px-3 py-1 tl-mono text-[10px] text-white/50">
                example-news.com/article
              </div>
            </div>
            <div className="absolute right-6 top-14 w-[260px] border border-[#00E5FF]/40 bg-[#0E0E0E] p-4 shadow-[0_0_40px_rgba(0,229,255,0.25)]">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-3">
                <Terminal size={14} color="#00E5FF" weight="bold" />
                <p className="tl-mono text-[10px] uppercase tracking-[0.25em]">truthlens · scan</p>
              </div>
              <p className="tl-mono text-[10px] uppercase tracking-[0.25em] text-white/40">verdict</p>
              <p className="tl-display text-4xl font-black text-[#FF3B30] leading-none mt-1">87<span className="text-base text-white/40 ml-1">%</span></p>
              <div className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 border border-[#FF3B30] text-[#FF3B30]">
                <span className="tl-mono text-[9px] font-bold tracking-[0.2em]">DEEPFAKE</span>
              </div>
              <div className="mt-3 space-y-1.5">
                <Bar v={87} c="#FF3B30" label="synthetic" />
                <Bar v={94} c="#00E5FF" label="confidence" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Bar({ v, c, label }) {
  return (
    <div>
      <div className="flex justify-between tl-mono text-[9px] uppercase tracking-[0.2em] text-white/50">
        <span>{label}</span>
        <span style={{ color: c }}>{v}%</span>
      </div>
      <div className="h-1 bg-white/10 mt-0.5">
        <div className="h-full" style={{ width: `${v}%`, background: c }} />
      </div>
    </div>
  );
}
