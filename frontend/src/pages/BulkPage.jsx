import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { bulkScan, fileToBase64 } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, ImageSquare, Link as LinkIcon, TextT, Lightning, X,
  ShieldCheck, Robot, WarningOctagon, Question, CircleNotch,
} from "@phosphor-icons/react";

const VERDICTS = {
  HUMAN:     { color: "#00FF66", Icon: ShieldCheck },
  AI:        { color: "#FFB800", Icon: Robot },
  DEEPFAKE:  { color: "#FF3B30", Icon: WarningOctagon },
  UNCERTAIN: { color: "#A1A1AA", Icon: Question },
};

let _seq = 0;
const newId = () => ++_seq;

export default function BulkPage() {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);

  const addImageFile = (f) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) { toast.error("PNG/JPEG/WebP only"); return; }
    if (f.size > 12 * 1024 * 1024) { toast.error("Max 12MB"); return; }
    setItems(prev => [...prev, { uid: newId(), kind: "image", file: f, preview: URL.createObjectURL(f), filename: f.name }]);
  };

  const addUrlRow = () => setItems(prev => [...prev, { uid: newId(), kind: "url", url: "" }]);
  const addTextRow = () => setItems(prev => [...prev, { uid: newId(), kind: "text", content: "" }]);

  const update = (uid, patch) => setItems(prev => prev.map(it => it.uid === uid ? { ...it, ...patch } : it));
  const remove = (uid) => setItems(prev => {
    const it = prev.find(i => i.uid === uid);
    if (it?.preview) URL.revokeObjectURL(it.preview);
    return prev.filter(i => i.uid !== uid);
  });

  const onDrop = (e) => {
    e.preventDefault();
    setActive(false);
    const fs = Array.from(e.dataTransfer.files || []);
    fs.slice(0, 12 - items.length).forEach(addImageFile);
  };

  useEffect(() => () => items.forEach(it => it.preview && URL.revokeObjectURL(it.preview)), []);

  const run = async () => {
    if (!items.length) return;
    if (items.length > 12) { toast.error("Max 12 items per bulk"); return; }
    setRunning(true);
    setResults(null);
    try {
      const payload = await Promise.all(items.map(async (it) => {
        if (it.kind === "image") return { kind: "image", image_base64: await fileToBase64(it.file), filename: it.filename };
        if (it.kind === "url") return { kind: "url", url: it.url };
        return { kind: "text", content: it.content };
      }));
      const res = await bulkScan(payload);
      setResults(res);
      toast.success(`Scanned ${res.summary.ok}/${res.summary.total}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Bulk scan failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Header />
      <main className="px-6 lg:px-12 py-12 max-w-7xl mx-auto" data-testid="bulk-page">
        <Link to="/" className="tl-mono text-xs uppercase tracking-[0.3em] text-white/60 hover:text-[#00E5FF] inline-flex items-center gap-2 mb-8">
          <ArrowLeft size={14} weight="bold" /> back
        </Link>
        <div className="mb-10 max-w-2xl">
          <p className="tl-mono text-xs uppercase tracking-[0.3em] text-[#00E5FF] mb-3">{t("bulk.label")}</p>
          <h1 className="tl-display text-5xl sm:text-6xl font-black leading-[0.95]">
            {t("bulk.title_1")}<br /><span className="text-[#00E5FF]">{t("bulk.title_2")}</span>
          </h1>
          <p className="text-white/65 mt-4">{t("bulk.subtitle")}</p>
        </div>

        <div
          data-testid="bulk-dropzone"
          data-active={active}
          onDragOver={(e) => { e.preventDefault(); setActive(true); }}
          onDragLeave={() => setActive(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="tl-dropzone border border-dashed border-white/25 p-10 text-center cursor-pointer min-h-[160px] flex flex-col items-center justify-center bg-black/20"
        >
          <ImageSquare size={28} weight="duotone" color="#00E5FF" />
          <p className="text-sm text-white/80 mt-3">{t("bulk.drop_hint")}</p>
          <p className="tl-mono text-[10px] uppercase tracking-[0.25em] text-white/40 mt-1">max 12 · {items.length}/12</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            data-testid="bulk-file-input"
            onChange={(e) => Array.from(e.target.files || []).forEach(addImageFile)}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={addUrlRow} data-testid="bulk-add-url" className="rounded-none bg-transparent border border-white/15 hover:border-[#00E5FF] hover:text-[#00E5FF] text-white tl-mono text-[10px] uppercase tracking-[0.25em]">
            <LinkIcon size={12} weight="bold" className="mr-2" /> {t("bulk.add_url")}
          </Button>
          <Button onClick={addTextRow} data-testid="bulk-add-text" className="rounded-none bg-transparent border border-white/15 hover:border-[#00E5FF] hover:text-[#00E5FF] text-white tl-mono text-[10px] uppercase tracking-[0.25em]">
            <TextT size={12} weight="bold" className="mr-2" /> {t("bulk.add_text")}
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          {items.length === 0 && (
            <p className="tl-mono text-[10px] uppercase tracking-[0.25em] text-white/40 text-center py-10 border border-white/10">
              {t("bulk.queue_empty")}
            </p>
          )}
          {items.map((it) => (
            <div key={it.uid} className="border border-white/10 bg-[#0E0E0E] p-3 flex items-center gap-3" data-testid={`bulk-item-${it.uid}`}>
              {it.kind === "image" && (
                <>
                  <img src={it.preview} alt="" className="w-14 h-14 object-cover bg-black border border-white/10" />
                  <div className="flex-1 min-w-0">
                    <p className="tl-mono text-[10px] uppercase tracking-[0.25em] text-[#00E5FF]">IMAGE</p>
                    <p className="text-xs text-white/70 truncate">{it.filename}</p>
                  </div>
                </>
              )}
              {it.kind === "url" && (
                <>
                  <LinkIcon size={20} weight="bold" className="text-[#00E5FF]" />
                  <Input
                    value={it.url}
                    onChange={(e) => update(it.uid, { url: e.target.value })}
                    placeholder="https://example.com/article"
                    className="rounded-none bg-black border-white/15 text-white text-xs"
                  />
                </>
              )}
              {it.kind === "text" && (
                <>
                  <TextT size={20} weight="bold" className="text-[#00E5FF]" />
                  <Textarea
                    value={it.content}
                    onChange={(e) => update(it.uid, { content: e.target.value })}
                    rows={2}
                    placeholder="Paste text…"
                    className="rounded-none bg-black border-white/15 text-white text-xs resize-none"
                  />
                </>
              )}
              <button
                type="button"
                onClick={() => remove(it.uid)}
                className="w-8 h-8 bg-black/70 border border-white/20 hover:border-[#FF3B30] flex items-center justify-center"
                data-testid={`bulk-remove-${it.uid}`}
              >
                <X size={12} weight="bold" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <Button
            onClick={run}
            disabled={running || !items.length}
            data-testid="bulk-run-btn"
            className="rounded-none bg-[#00E5FF] hover:bg-white text-black tl-mono text-[11px] uppercase tracking-[0.25em] font-bold px-8 py-6 disabled:opacity-50"
          >
            <Lightning size={16} weight="bold" className="mr-2" />
            {running ? t("bulk.running") : t("bulk.run")}
          </Button>
        </div>

        <AnimatePresence>
          {running && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mt-8 border border-[#00E5FF]/40 p-6 bg-[#0A0A0A] tl-scanlines relative overflow-hidden"
              data-testid="bulk-loading"
            >
              <div className="tl-laser" />
              <div className="flex items-center gap-3">
                <CircleNotch size={20} weight="bold" className="text-[#00E5FF] animate-spin" />
                <p className="tl-mono text-xs uppercase tracking-[0.3em] text-[#00E5FF]">// SCANNING {items.length} ITEMS</p>
              </div>
            </motion.div>
          )}

          {results && !running && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="mt-10 space-y-6"
              data-testid="bulk-results"
            >
              <div className="border border-[#00E5FF]/40 bg-[#0E0E0E] p-6 grid grid-cols-3 sm:grid-cols-4 gap-4">
                <Stat label={t("bulk.summary")} v={`${results.summary.ok}/${results.summary.total}`} c="#00E5FF" />
                <Stat label={t("bulk.deepfakes")} v={results.summary.deepfakes} c="#FF3B30" />
                <Stat label={t("bulk.ai")} v={results.summary.ai} c="#FFB800" />
                <Stat label="HUMAN" v={results.summary.ok - results.summary.deepfakes - results.summary.ai} c="#00FF66" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.results.map((r, i) => (
                  <ResultTile key={i} r={r} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, v, c }) {
  return (
    <div>
      <p className="tl-mono text-[10px] uppercase tracking-[0.3em] text-white/40">{label}</p>
      <p className="tl-display text-3xl font-black mt-1" style={{ color: c }}>{v}</p>
    </div>
  );
}

function ResultTile({ r }) {
  if (!r.ok) {
    return (
      <div className="border border-[#FF3B30]/40 bg-[#0A0A0A] p-4">
        <p className="tl-mono text-[10px] uppercase tracking-[0.25em] text-[#FF3B30]">ERROR</p>
        <p className="text-xs text-white/65 mt-2 break-words">{r.error}</p>
        {r.filename && <p className="tl-mono text-[10px] text-white/40 mt-1 truncate">{r.filename}</p>}
      </div>
    );
  }
  const s = r.scan;
  const v = VERDICTS[s.classification] || VERDICTS.UNCERTAIN;
  return (
    <Link
      to={`/report/${s.id}`}
      data-testid={`bulk-tile-${s.id}`}
      className="border bg-[#0A0A0A] p-4 hover:bg-white/[0.03] transition-colors block"
      style={{ borderColor: v.color + "55" }}
    >
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 px-1.5 py-0.5 border" style={{ borderColor: v.color, color: v.color }}>
          <v.Icon size={11} weight="bold" />
          <span className="tl-mono text-[9px] uppercase tracking-[0.2em] font-bold">{s.classification}</span>
        </div>
        <p className="tl-display text-3xl font-black" style={{ color: v.color }}>
          {s.score}<span className="text-sm text-white/30 ml-0.5">%</span>
        </p>
      </div>
      <p className="text-xs text-white/70 mt-3 line-clamp-2 break-words">{s.preview || s.summary}</p>
    </Link>
  );
}
