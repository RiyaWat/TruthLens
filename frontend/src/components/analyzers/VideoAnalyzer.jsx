import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { analyzeVideo, fileToBase64 } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { VideoCamera, X, Lightning } from "@phosphor-icons/react";

export default function VideoAnalyzer({ onScanning, onResult, scanning }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [active, setActive] = useState(false);
  const inputRef = useRef(null);

  const accept = (f) => {
    if (!f) return;
    if (!/^video\//.test(f.type)) {
      toast.error("Please upload a video file.");
      return;
    }
    if (f.size > 30 * 1024 * 1024) {
      toast.error("Video must be under 30MB.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setActive(false);
    accept(e.dataTransfer.files?.[0]);
  };

  const submit = async () => {
    if (!file) return;
    onScanning(true);
    try {
      const b64 = await fileToBase64(file);
      const res = await analyzeVideo(b64, file.name);
      onResult(res);
      toast.success("Analysis complete");
    } catch (e) {
      onScanning(false);
      toast.error(e?.response?.data?.detail || "Analysis failed");
    }
  };

  const reset = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  return (
    <div data-testid="video-analyzer" className="space-y-4">
      <p className="tl-mono text-[11px] uppercase tracking-[0.25em] text-white/50">{t("dashboard.drop_video")}</p>
      {!file ? (
        <div
          data-testid="video-dropzone"
          data-active={active}
          onDragOver={(e) => { e.preventDefault(); setActive(true); }}
          onDragLeave={() => setActive(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="tl-dropzone border border-dashed border-white/25 p-12 text-center cursor-pointer min-h-[260px] flex flex-col items-center justify-center bg-black/20"
        >
          <VideoCamera size={36} weight="duotone" color="#00E5FF" />
          <p className="mt-4 text-sm text-white/80">{t("dashboard.drop_video_hint")}</p>
          <p className="tl-mono text-[10px] uppercase tracking-[0.25em] text-white/40 mt-2">{t("dashboard.max_video")}</p>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            data-testid="video-file-input"
            onChange={(e) => accept(e.target.files?.[0])}
          />
        </div>
      ) : (
        <div className="border border-white/15 p-3 bg-black/40 relative">
          <video src={preview} controls className="w-full max-h-[360px] bg-black" />
          <button
            type="button"
            onClick={reset}
            data-testid="video-clear-btn"
            className="absolute top-2 right-2 w-8 h-8 bg-black/70 border border-white/20 hover:border-[#FF3B30] flex items-center justify-center"
          >
            <X size={14} weight="bold" />
          </button>
          <p className="tl-mono text-[10px] uppercase tracking-[0.25em] text-white/40 mt-2">{file.name}</p>
        </div>
      )}
      <div className="flex justify-end">
        <Button
          onClick={submit}
          disabled={!file || scanning}
          data-testid="video-analyze-btn"
          className="rounded-none bg-[#00E5FF] hover:bg-white text-black tl-mono text-[11px] uppercase tracking-[0.25em] font-bold px-5 disabled:opacity-50"
        >
          <Lightning size={14} weight="bold" className="mr-2" />
          {scanning ? t("dashboard.analyzing") : t("dashboard.analyze_video")}
        </Button>
      </div>
    </div>
  );
}
