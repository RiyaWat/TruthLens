import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { compareScan, fileToBase64 } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  TextT, ImageSquare, VideoCamera, Link as LinkIcon, ArrowLeft, ArrowsLeftRight,
  Lightning, Trophy, X, CircleNotch, Robot, ShieldCheck, Question, WarningOctagon,
} from "@phosphor-icons/react";

const VERDICTS = {
  HUMAN:     { color: "#00FF66", Icon: ShieldCheck, key: "verdict.human" },
  AI:        { color: "#FFB800", Icon: Robot, key: "verdict.ai" },
  DEEPFAKE:  { color: "#FF3B30", Icon: WarningOctagon, key: "verdict.deepfake" },
  UNCERTAIN: { color: "#A1A1AA", Icon: Question, key: "verdict.uncertain" },
};

export default function ComparePage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState("text");
  const [a, setA] = useState({ content: "", url: "", file: null, preview: null });
  const [b, setB] = useState({ content: "", url: "", file: null, preview: null });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const reset = () => { setA({ content: "", url: "", file: null, preview: null });
                       setB({ content: "", url: "", file: null, preview: null });
                       setResult(null); };

  const switchMode = (v) => { reset(); setMode(v); };

  const submit = async () => {
    let items;
    try {
      if (mode === "text") {
        if (a.content.trim().length < 20 || b.content.trim().length < 20)
          throw new Error("Each text must be at least 20 characters");
        items = [
          { label: "A", type: "text", content: a.content },
          { label: "B", type: "text", content: b.content },
        ];
      } else if (mode === "url") {
        if (!/^https?:\/\//.test(a.url) || !/^https?:\/\//.test(b.url))
          throw new Error("Each URL must start with http(s)://");
        items = [
          { label: "A", type: "url", url: a.url.trim() },
          { label: "B", type: "url", url: b.url.trim() },
        ];
      } else if (mode === "video") {
        if (!a.file || !b.file) throw new Error("Drop two videos to compare");
        const [ab, bb] = await Promise.all([fileToBase64(a.file), fileToBase64(b.file)]);
        items = [
          { label: "A", type: "video", video_base64: ab },
          { label: "B", type: "video", video_base64: bb },
        ];
      } else {
        if (!a.file || !b.file) throw new Error("Drop two images to compare");
        const [ab, bb] = await Promise.all([fileToBase64(a.file), fileToBase64(b.file)]);
        items = [
          { label: "A", type: "image", image_base64: ab },
          { label: "B", type: "image", image_base64: bb },
        ];
      }
    } catch (e) {
      toast.error(e.message || "Invalid input");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await compareScan(items);
      setResult(res);
      toast.success("Comparison complete");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Comparison failed");
    } finally {
      setLoading(false);
    }
  };

  const MODES = [
    { v: "text", icon: TextT, label: t("compare.tab_text") },
    { v: "image", icon: ImageSquare, label: t("compare.tab_image") },
    { v: "video", icon: VideoCamera, label: t("compare.tab_video") },
    { v: "url", icon: LinkIcon, label: t("compare.tab_url") },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Header />
      <main className="px-6 lg:px-12 py-12 max-w-7xl mx-auto" data-testid="compare-page">
        <Link
          to="/"
          className="tl-mono text-xs uppercase tracking-[0.3em] text-white/60 hover:text-[#00E5FF] inline-flex items-center gap-2 mb-8"
          data-testid="compare-back-link"
        >
          <ArrowLeft size={14} weight="bold" /> {t("compare.back")}
        </Link>
        <div className="mb-10 max-w-2xl">
          <p className="tl-mono text-xs uppercase tracking-[0.3em] text-[#00E5FF] mb-3">
            {t("compare.label")}
          </p>
          <h1 className="tl-display text-5xl sm:text-6xl font-black leading-[0.95]">
            {t("compare.title_1")}<br />
            <span className="text-[#00E5FF]">{t("compare.title_2")}</span>
          </h1>
          <p className="text-white/65 mt-4">{t("compare.subtitle")}</p>
        </div>

        <Tabs value={mode} onValueChange={switchMode} className="w-full">
          <TabsList className="bg-transparent rounded-none border border-white/10 p-0 h-auto grid grid-cols-2 sm:grid-cols-4 gap-0 max-w-3xl">
            {MODES.map(({ v, icon: Icon, label }) => (
              <TabsTrigger
                key={v}
                value={v}
                data-testid={`compare-tab-${v}`}
                className="tl-tabs-trigger rounded-none border-r border-b sm:border-b-0 border-white/10 last:border-r-0 py-4 tl-mono text-[11px] uppercase tracking-[0.25em] text-white/60 data-[state=active]:shadow-none flex items-center justify-center gap-2"
              >
                <Icon size={14} weight="bold" /> {label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="text" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SidePanel label="A" color="#00E5FF">
                <Textarea
                  data-testid="compare-text-a"
                  value={a.content}
                  onChange={(e) => setA({ ...a, content: e.target.value })}
                  rows={9}
                  placeholder="Paste text A…"
                  className="bg-black border-white/15 rounded-none text-white placeholder:text-white/30 focus-visible:ring-[#00E5FF] focus-visible:ring-1 focus-visible:ring-offset-0"
                />
              </SidePanel>
              <SidePanel label="B" color="#FFB800">
                <Textarea
                  data-testid="compare-text-b"
                  value={b.content}
                  onChange={(e) => setB({ ...b, content: e.target.value })}
                  rows={9}
                  placeholder="Paste text B…"
                  className="bg-black border-white/15 rounded-none text-white placeholder:text-white/30 focus-visible:ring-[#FFB800] focus-visible:ring-1 focus-visible:ring-offset-0"
                />
              </SidePanel>
            </div>
          </TabsContent>
          <TabsContent value="url" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SidePanel label="A" color="#00E5FF">
                <Input
                  data-testid="compare-url-a"
                  value={a.url}
                  onChange={(e) => setA({ ...a, url: e.target.value })}
                  placeholder="https://site-a.com/article"
                  className="rounded-none bg-black border-white/15 text-white placeholder:text-white/30 focus-visible:ring-[#00E5FF] focus-visible:ring-1 focus-visible:ring-offset-0"
                />
              </SidePanel>
              <SidePanel label="B" color="#FFB800">
                <Input
                  data-testid="compare-url-b"
                  value={b.url}
                  onChange={(e) => setB({ ...b, url: e.target.value })}
                  placeholder="https://site-b.com/article"
                  className="rounded-none bg-black border-white/15 text-white placeholder:text-white/30 focus-visible:ring-[#FFB800] focus-visible:ring-1 focus-visible:ring-offset-0"
                />
              </SidePanel>
            </div>
          </TabsContent>
          <TabsContent value="image" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MediaDrop kind="image" label="A" color="#00E5FF" state={a} setState={setA} testid="compare-image-a" hint={t("compare.drop_image_short")} />
              <MediaDrop kind="image" label="B" color="#FFB800" state={b} setState={setB} testid="compare-image-b" hint={t("compare.drop_image_short")} />
            </div>
          </TabsContent>
          <TabsContent value="video" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MediaDrop kind="video" label="A" color="#00E5FF" state={a} setState={setA} testid="compare-video-a" hint={t("compare.drop_video_short")} />
              <MediaDrop kind="video" label="B" color="#FFB800" state={b} setState={setB} testid="compare-video-b" hint={t("compare.drop_video_short")} />
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-center">
          <Button
            onClick={submit}
            disabled={loading}
            data-testid="compare-run-btn"
            className="rounded-none bg-[#00E5FF] hover:bg-white text-black tl-mono text-[11px] uppercase tracking-[0.25em] font-bold px-8 py-6"
          >
            <ArrowsLeftRight size={16} weight="bold" className="mr-2" />
            {loading ? t("compare.running") : t("compare.run")}
          </Button>
        </div>

        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mt-10 border border-[#00E5FF]/40 p-8 bg-[#0A0A0A] tl-scanlines relative overflow-hidden"
              data-testid="compare-loading"
            >
              <div className="tl-laser" />
              <div className="flex items-center gap-3">
                <CircleNotch size={20} weight="bold" className="text-[#00E5FF] animate-spin" />
                <p className="tl-mono text-xs uppercase tracking-[0.3em] text-[#00E5FF]">{t("compare.loading")}</p>
              </div>
            </motion.div>
          )}

          {result && !loading && <ResultPanel result={result} />}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}

function SidePanel({ label, color, children }) {
  const { t } = useTranslation();
  return (
    <div className="border p-4 bg-[#0E0E0E]" style={{ borderColor: color + "40" }}>
      <div className="inline-flex items-center gap-2 mb-3 px-2 py-1 border" style={{ borderColor: color, color }}>
        <span className="tl-mono text-[10px] uppercase tracking-[0.3em] font-bold">{t("compare.subject")} {label}</span>
      </div>
      {children}
    </div>
  );
}

function MediaDrop({ kind, label, color, state, setState, testid, hint }) {
  const inputRef = useRef(null);
  const [active, setActive] = useState(false);
  const accept = kind === "image" ? "image/png,image/jpeg,image/webp" : "video/*";
  const Icon = kind === "image" ? ImageSquare : VideoCamera;

  const acceptFile = (f) => {
    if (!f) return;
    if (kind === "image" && !/^image\/(png|jpe?g|webp)$/.test(f.type)) { toast.error("PNG/JPEG/WebP only"); return; }
    if (kind === "video" && !/^video\//.test(f.type)) { toast.error("Video only"); return; }
    if (f.size > (kind === "video" ? 30 : 12) * 1024 * 1024) { toast.error(`Max ${kind === "video" ? 30 : 12}MB`); return; }
    if (state.preview) URL.revokeObjectURL(state.preview);
    setState({ ...state, file: f, preview: URL.createObjectURL(f) });
  };

  const reset = () => {
    if (state.preview) URL.revokeObjectURL(state.preview);
    setState({ ...state, file: null, preview: null });
  };

  return (
    <SidePanel label={label} color={color}>
      {!state.file ? (
        <div
          data-testid={testid}
          data-active={active}
          onDragOver={(e) => { e.preventDefault(); setActive(true); }}
          onDragLeave={() => setActive(false)}
          onDrop={(e) => { e.preventDefault(); setActive(false); acceptFile(e.dataTransfer.files?.[0]); }}
          onClick={() => inputRef.current?.click()}
          className="tl-dropzone border border-dashed border-white/25 p-10 text-center cursor-pointer min-h-[180px] flex flex-col items-center justify-center bg-black/20"
        >
          <Icon size={28} weight="duotone" color={color} />
          <p className="text-xs text-white/70 mt-3">{hint}</p>
          <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => acceptFile(e.target.files?.[0])} />
        </div>
      ) : (
        <div className="relative bg-black/40 border border-white/10">
          {kind === "image"
            ? <img src={state.preview} alt="" className="w-full max-h-56 object-contain bg-black" />
            : <video src={state.preview} controls className="w-full max-h-56 bg-black" />}
          <button type="button" onClick={reset} className="absolute top-1 right-1 w-7 h-7 bg-black/70 border border-white/20 hover:border-[#FF3B30] flex items-center justify-center">
            <X size={12} weight="bold" />
          </button>
        </div>
      )}
    </SidePanel>
  );
}

function ResultPanel({ result }) {
  const { t } = useTranslation();
  const [a, b] = result.items;
  const winnerLabel = result.winner;
  const winnerScan = winnerLabel === "tie" ? null : winnerLabel === "A" ? a : b;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="mt-10 space-y-6"
      data-testid="compare-result"
    >
      <div className="border border-[#00E5FF]/40 bg-[#0E0E0E] p-6 flex items-center gap-4 flex-wrap">
        <Trophy size={20} weight="duotone" color="#00E5FF" />
        <div className="flex-1 min-w-[220px]">
          <p className="tl-mono text-[10px] uppercase tracking-[0.3em] text-white/50">{t("compare.verdict")}</p>
          {winnerLabel === "tie" ? (
            <p className="tl-display text-2xl font-black mt-1">{t("compare.tie")}</p>
          ) : (
            <p className="tl-display text-2xl font-black mt-1">
              {t("compare.winner_a", { label: winnerLabel })}
              <span className="text-white/50 tl-mono text-sm font-normal ml-3">Δ {result.delta}%</span>
            </p>
          )}
          {winnerScan && (
            <p className="text-white/65 text-sm mt-1.5">{winnerScan.summary}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SideCard label="A" color="#00E5FF" scan={a} highlighted={winnerLabel === "A"} />
        <SideCard label="B" color="#FFB800" scan={b} highlighted={winnerLabel === "B"} />
      </div>
    </motion.div>
  );
}

function SideCard({ label, color, scan, highlighted }) {
  const { t } = useTranslation();
  const v = VERDICTS[scan.classification] || VERDICTS.UNCERTAIN;
  const c = v.color;
  return (
    <div
      data-testid={`compare-side-${label}`}
      className={`relative border p-5 bg-[#0A0A0A] ${highlighted ? "ring-2 ring-[#00E5FF]/60" : ""}`}
      style={{ borderColor: c + "55" }}
    >
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 px-2 py-1 border" style={{ borderColor: color, color }}>
          <span className="tl-mono text-[10px] uppercase tracking-[0.3em] font-bold">{t("compare.subject")} {label}</span>
        </div>
        <Link to={`/report/${scan.id}`} className="tl-mono text-[10px] uppercase tracking-[0.25em] text-[#00E5FF] hover:text-white">
          full report →
        </Link>
      </div>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-1.5 py-0.5 border" style={{ borderColor: c, color: c }}>
            <v.Icon size={12} weight="bold" />
            <span className="tl-mono text-[9px] uppercase tracking-[0.2em] font-bold">{t(v.key)}</span>
          </div>
          {scan.language && scan.language.toUpperCase() !== "N/A" && (
            <p data-testid="language-badge" className="tl-mono text-[9px] uppercase tracking-[0.25em] text-white/40 mt-1.5">
              {t("common.lang")} · {scan.language}
            </p>
          )}
        </div>
        <p className="tl-score-num text-5xl" style={{ color: c }}>
          {scan.score}<span className="text-lg text-white/40 ml-1">%</span>
        </p>
      </div>
      <div className="mt-3 h-1.5 bg-white/10">
        <div className="h-full" style={{ width: `${scan.score}%`, background: c }} />
      </div>
      <p className="text-xs text-white/70 mt-4 leading-relaxed line-clamp-4">{scan.summary}</p>
    </div>
  );
}
