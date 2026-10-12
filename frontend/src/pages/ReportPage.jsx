import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VerdictCard from "@/components/VerdictCard";
import { fetchScan, pdfUrl, ogUrl, fileUrl } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, FilePdf, Share, ImageSquare } from "@phosphor-icons/react";

export default function ReportPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [scan, setScan] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetchScan(id).then(setScan).catch(e => setErr(String(e)));
  }, [id]);

  // Inject OG tags so that share-link preview shows the verdict card
  useEffect(() => {
    if (!scan) return;
    const og = ogUrl(scan.id);
    const url = window.location.href;
    const title = `TruthLens · ${scan.classification} ${scan.score}% · ${scan.type.toUpperCase()}`;
    const desc = scan.summary || "Forensic deepfake & AI-content detection";

    const setMeta = (sel, attr, val) => {
      let el = document.head.querySelector(sel);
      if (!el) {
        el = document.createElement("meta");
        const [attrName, attrVal] = sel.match(/\[([^=]+)="([^"]+)"\]/).slice(1);
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, val);
    };

    document.title = title;
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[property="og:image"]', "content", og);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:type"]', "content", "article");
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", desc);
    setMeta('meta[name="twitter:image"]', "content", og);
  }, [scan]);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: "TruthLens scan", url }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("report.copied"));
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Header />
      <main className="px-6 lg:px-12 py-12 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <Link
            to="/"
            data-testid="report-back-link"
            className="tl-mono text-xs uppercase tracking-[0.3em] text-white/60 hover:text-[#00E5FF] inline-flex items-center gap-2"
          >
            <ArrowLeft size={14} weight="bold" /> {t("report.back")}
          </Link>
          {scan && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={share}
                data-testid="report-share-btn"
                className="inline-flex items-center gap-2 px-4 py-2 border border-white/15 hover:border-[#00E5FF] hover:text-[#00E5FF] text-white tl-mono text-[11px] uppercase tracking-[0.25em] font-bold transition-colors"
              >
                <Share size={14} weight="bold" /> {t("report.share_link")}
              </button>
              <a
                href={pdfUrl(scan.id)}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="report-download-pdf"
                className="inline-flex items-center gap-2 px-4 py-2 border border-[#00E5FF] hover:bg-[#00E5FF] hover:text-black text-[#00E5FF] tl-mono text-[11px] uppercase tracking-[0.25em] font-bold transition-colors"
              >
                <FilePdf size={14} weight="bold" /> {t("report.download_pdf")}
              </a>
            </div>
          )}
        </div>
        {err && <p className="text-[#FF3B30] tl-mono text-sm">{err}</p>}
        {!scan && !err && <p className="text-white/60 tl-mono text-sm">Loading report…</p>}
        {scan && (
          <div className="space-y-8" data-testid="report-detail">
            <div>
              <p className="tl-mono text-xs uppercase tracking-[0.3em] text-[#00E5FF] mb-3">
                {t("report.header")} {scan.type.toUpperCase()}
              </p>
              <h1 className="tl-display text-4xl sm:text-5xl font-black leading-none">
                Scan #{scan.id.slice(0, 8)}
              </h1>
              <p className="text-white/50 tl-mono text-xs mt-2">
                {new Date(scan.created_at).toLocaleString()}
              </p>
            </div>
            <VerdictCard scan={scan} expanded />
            {scan.storage_path && (scan.type === "image" || scan.type === "video") && (
              <div className="border border-white/10 p-3 bg-[#121212]">
                <p className="tl-mono text-[10px] uppercase tracking-[0.3em] text-white/50 mb-3 flex items-center gap-1.5">
                  <ImageSquare size={11} weight="bold" /> // ORIGINAL
                </p>
                {scan.type === "image" ? (
                  <img
                    src={fileUrl(scan.storage_path)}
                    alt="original"
                    data-testid="report-original-image"
                    className="w-full max-h-[460px] object-contain bg-black"
                  />
                ) : (
                  <video
                    src={fileUrl(scan.storage_path)}
                    controls
                    data-testid="report-original-video"
                    className="w-full max-h-[460px] bg-black"
                  />
                )}
              </div>
            )}
            {scan.preview && (
              <div className="border border-white/10 p-6 bg-[#121212]">
                <p className="tl-mono text-[10px] uppercase tracking-[0.3em] text-white/50 mb-3">{t("report.preview")}</p>
                <p className="text-sm text-white/80 break-words">{scan.preview}</p>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
