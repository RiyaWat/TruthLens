import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CircleNotch, ShieldCheck, WarningOctagon, Question, Robot } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const VERDICTS = {
  HUMAN:     { color: "#00FF66", key: "verdict.human",     Icon: ShieldCheck,    blurb: "No strong synthesis markers detected." },
  AI:        { color: "#FFB800", key: "verdict.ai",        Icon: Robot,          blurb: "Strong AI fingerprints in this content." },
  DEEPFAKE:  { color: "#FF3B30", key: "verdict.deepfake",  Icon: WarningOctagon, blurb: "Likely a manipulated/deepfake media." },
  UNCERTAIN: { color: "#A1A1AA", key: "verdict.uncertain", Icon: Question,       blurb: "Mixed signals — interpret carefully." },
};

function AnimatedNumber({ value }) {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    let raf;
    const start = performance.now();
    const dur = 700;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n}</>;
}

export default function VerdictCard({ scan, scanning, expanded }) {
  const { t } = useTranslation();
  if (scanning) {
    return (
      <div data-testid="verdict-scanning" className="relative overflow-hidden border border-[#00E5FF]/40 p-8 bg-[#0A0A0A] tl-scanlines">
        <div className="tl-laser" />
        <div className="flex items-center gap-3">
          <CircleNotch size={20} weight="bold" className="text-[#00E5FF] animate-spin" />
          <p className="tl-mono text-xs uppercase tracking-[0.3em] text-[#00E5FF]">
            {t("verdict.scanning")}
          </p>
        </div>
        <p className="text-white/60 mt-4 text-sm">
          {t("verdict.scanning_sub")}
        </p>
      </div>
    );
  }

  if (!scan) return null;
  const v = VERDICTS[scan.classification] || VERDICTS.UNCERTAIN;
  const { color, key, Icon, blurb } = v;
  const label = t(key);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={scan.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        data-testid="verdict-card"
        className="relative border p-6 lg:p-8 bg-[#0A0A0A]"
        style={{ borderColor: color + "55" }}
      >
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-2 py-1 border" style={{ borderColor: color, color }}>
                <Icon size={14} weight="bold" />
                <span className="tl-mono text-[10px] uppercase tracking-[0.25em] font-bold">{label}</span>
              </div>
              {scan.language && scan.language.toUpperCase() !== "N/A" && (
                <div
                  data-testid="language-badge"
                  className="inline-flex items-center gap-1.5 px-2 py-1 border border-white/15 text-white/70"
                >
                  <span className="tl-mono text-[10px] uppercase tracking-[0.25em]">{t("common.lang")} · {scan.language}</span>
                </div>
              )}
            </div>
            <p className="text-white/85 mt-4 text-sm sm:text-base leading-relaxed">{scan.summary || blurb}</p>
          </div>
          <div className="text-right">
            <p className="tl-mono text-[10px] uppercase tracking-[0.3em] text-white/40">{t("verdict.prob_ai")}</p>
            <p className="tl-score-num text-7xl lg:text-8xl mt-1" style={{ color }}>
              <AnimatedNumber value={scan.score} />
              <span className="text-3xl text-white/40 ml-1">%</span>
            </p>
            <div className="mt-3 w-40 h-1.5 bg-white/10 ml-auto overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${scan.score}%` }}
                transition={{ duration: 0.7 }}
                className="h-full"
                style={{ background: color }}
              />
            </div>
            <p className="tl-mono text-[10px] uppercase tracking-[0.25em] text-white/40 mt-2">
              {t("verdict.confidence")} · {scan.confidence}%
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="tl-mono text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">{t("verdict.reasoning")}</p>
          <p className="text-sm text-white/70 leading-relaxed">{scan.reasoning}</p>
        </div>

        {scan.markers && scan.markers.length > 0 && (
          <div className="mt-6">
            <p className="tl-mono text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3">{t("verdict.markers")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {scan.markers.map((m, i) => (
                <Marker key={i} m={m} />
              ))}
            </div>
          </div>
        )}

        {!expanded && (
          <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
            <p className="tl-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
              ID · {scan.id.slice(0, 8)}
            </p>
            <Link
              to={`/report/${scan.id}`}
              data-testid="open-report-link"
              className="tl-mono text-[11px] uppercase tracking-[0.25em] text-[#00E5FF] hover:text-white transition-colors"
            >
              {t("verdict.open_report")}
            </Link>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function Marker({ m }) {
  const sevColor = m.severity === "danger" ? "#FF3B30" : m.severity === "warn" ? "#FFB800" : "#00E5FF";
  return (
    <div className="border border-white/10 p-3 bg-black/30">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5" style={{ background: sevColor }} />
        <p className="tl-mono text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: sevColor }}>
          {m.label}
        </p>
      </div>
      <p className="text-xs text-white/65 mt-1.5 leading-relaxed">{m.detail}</p>
    </div>
  );
}
