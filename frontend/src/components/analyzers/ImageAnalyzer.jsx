import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { analyzeImage, fileToBase64 } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ImageSquare, X, Lightning } from "@phosphor-icons/react";

export default function ImageAnalyzer({ onScanning, onResult, scanning }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [active, setActive] = useState(false);
  const inputRef = useRef(null);

  const accept = (f) => {
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) {
      toast.error("Use PNG, JPEG or WebP only.");
      return;
    }
    if (f.size > 12 * 1024 * 1024) {
      toast.error("Image must be under 12MB.");
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
      const res = await analyzeImage(b64, file.name);
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
    <div data-testid="image-analyzer" className="space-y-4">
      <p className="tl-mono text-[11px] uppercase tracking-[0.25em] text-white/50">{t("dashboard.drop_image")}</p>
      {!file ? (
        <div
          data-testid="image-dropzone"
          data-active={active}
          onDragOver={(e) => { e.preventDefault(); setActive(true); }}
          onDragLeave={() => setActive(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="tl-dropzone border border-dashed border-white/25 p-12 text-center cursor-pointer min-h-[260px] flex flex-col items-center justify-center bg-black/20"
        >
          <ImageSquare size={36} weight="duotone" color="#00E5FF" />
          <p className="mt-4 text-sm text-white/80">{t("dashboard.drop_image_hint")}</p>
          <p className="tl-mono text-[10px] uppercase tracking-[0.25em] text-white/40 mt-2">{t("dashboard.max_image")}</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            data-testid="image-file-input"
            onChange={(e) => accept(e.target.files?.[0])}
          />
        </div>
      ) : (
        <div className="border border-white/15 p-3 bg-black/40 relative">
          <img src={preview} alt="" className="w-full max-h-[360px] object-contain bg-black" />
          <button
            type="button"
            onClick={reset}
            data-testid="image-clear-btn"
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
          data-testid="image-analyze-btn"
          className="rounded-none bg-[#00E5FF] hover:bg-white text-black tl-mono text-[11px] uppercase tracking-[0.25em] font-bold px-5 disabled:opacity-50"
        >
          <Lightning size={14} weight="bold" className="mr-2" />
          {scanning ? t("dashboard.analyzing") : t("dashboard.analyze_image")}
        </Button>
      </div>
    </div>
  );
}
