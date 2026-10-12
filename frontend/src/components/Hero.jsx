import React from "react";
import { motion } from "framer-motion";
import { ArrowDown, Crosshair, Scan } from "@phosphor-icons/react";
import { extensionUrl } from "@/lib/api";
import { useTranslation } from "react-i18next";

export default function Hero() {
  const { t } = useTranslation();
  return (
    <section
      data-testid="hero-section"
      className="relative overflow-hidden border-b border-white/10"
    >
      <div className="absolute inset-0 tl-grid-bg tl-grid-fade opacity-60" />
      <div
        className="absolute inset-0 opacity-[0.07] mix-blend-screen"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1750020113720-70f9c87982e9?crop=entropy&cs=srgb&fm=jpg&q=70&w=1600)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-12 pt-24 pb-28 lg:pt-36 lg:pb-44 grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 border border-white/15 px-3 py-1.5 mb-8"
          >
            <span className="w-1.5 h-1.5 bg-[#00FF66] rounded-full animate-pulse" />
            <span className="tl-mono text-[10px] uppercase tracking-[0.3em] text-white/70">
              {t("hero.badge")}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="tl-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black leading-[0.92]"
          >
            {t("hero.headline1")}<br />
            <span className="text-[#00E5FF]">{t("hero.headline2")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-8 max-w-xl text-base sm:text-lg text-white/70 leading-relaxed"
          >
            {t("hero.subhead")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.32 }}
            className="mt-10 flex flex-wrap gap-3"
          >
            <a
              href="#analyze"
              data-testid="hero-cta-analyze"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#00E5FF] hover:bg-white text-black tl-mono text-xs uppercase tracking-[0.25em] font-bold transition-colors"
            >
              <Scan size={16} weight="bold" /> {t("hero.cta_run")}
            </a>
            <a
              href={extensionUrl}
              data-testid="hero-cta-download"
              className="inline-flex items-center gap-2 px-6 py-3.5 border border-white/30 hover:border-[#00E5FF] hover:text-[#00E5FF] tl-mono text-xs uppercase tracking-[0.25em] font-bold transition-colors"
            >
              <Crosshair size={16} weight="bold" /> {t("hero.cta_install")}
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="hidden lg:flex col-span-4 flex-col gap-3 self-end"
        >
          <SpecRow k="MODELS" v="GPT-5.2 · Gemini 3 Pro" />
          <SpecRow k="LATENCY" v="< 8s avg" />
          <SpecRow k="MODES" v="TEXT · IMG · VIDEO · URL" />
          <SpecRow k="PROTOCOL" v="TL-FORENSIC v1" />
        </motion.div>
      </div>
      <a
        href="#analyze"
        className="absolute left-1/2 -translate-x-1/2 bottom-6 text-white/40 hover:text-[#00E5FF] tl-mono text-[10px] uppercase tracking-[0.3em] flex flex-col items-center gap-1.5 transition-colors"
        data-testid="hero-scroll-cue"
      >
        {t("hero.scroll")}
        <ArrowDown size={14} weight="bold" className="animate-bounce" />
      </a>
    </section>
  );
}

function SpecRow({ k, v }) {
  return (
    <div className="border border-white/10 px-4 py-3 flex justify-between gap-4 bg-black/30">
      <span className="tl-mono text-[10px] uppercase tracking-[0.3em] text-white/50">{k}</span>
      <span className="tl-mono text-[10px] uppercase tracking-[0.2em] text-[#00E5FF] truncate">{v}</span>
    </div>
  );
}
