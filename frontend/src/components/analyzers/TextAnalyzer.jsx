import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { analyzeText } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Lightning } from "@phosphor-icons/react";

const SAMPLE = `As we navigate the rapidly evolving landscape of digital communication, it is imperative to acknowledge the multifaceted role that artificial intelligence plays in shaping our daily lives. Furthermore, leveraging cutting-edge technologies enables us to unlock unprecedented opportunities for growth and innovation across various sectors.`;

export default function TextAnalyzer({ onScanning, onResult, scanning }) {
  const { t } = useTranslation();
  const [text, setText] = useState("");

  const submit = async () => {
    if (text.trim().length < 20) {
      toast.error("Please paste at least 20 characters of text.");
      return;
    }
    onScanning(true);
    try {
      const res = await analyzeText(text);
      onResult(res);
      toast.success("Analysis complete");
    } catch (e) {
      onScanning(false);
      toast.error(e?.response?.data?.detail || "Analysis failed");
    }
  };

  return (
    <div data-testid="text-analyzer" className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="tl-mono text-[11px] uppercase tracking-[0.25em] text-white/50">{t("dashboard.paste_text")}</p>
        <button
          type="button"
          onClick={() => setText(SAMPLE)}
          data-testid="text-sample-btn"
          className="tl-mono text-[10px] uppercase tracking-[0.25em] text-[#00E5FF] hover:text-white transition-colors"
        >
          {t("dashboard.load_sample")}
        </button>
      </div>
      <Textarea
        data-testid="text-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder="Paste an article, social post, message, or any block of writing…"
        className="bg-black border-white/15 rounded-none text-white placeholder:text-white/30 font-['IBM_Plex_Sans'] focus-visible:ring-[#00E5FF] focus-visible:ring-1 focus-visible:ring-offset-0"
      />
      <div className="flex justify-between items-center">
        <p className="tl-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
          {text.length} {t("dashboard.chars")}
        </p>
        <Button
          onClick={submit}
          disabled={scanning}
          data-testid="text-analyze-btn"
          className="rounded-none bg-[#00E5FF] hover:bg-white text-black tl-mono text-[11px] uppercase tracking-[0.25em] font-bold px-5"
        >
          <Lightning size={14} weight="bold" className="mr-2" />
          {scanning ? t("dashboard.analyzing") : t("dashboard.analyze_text")}
        </Button>
      </div>
    </div>
  );
}
