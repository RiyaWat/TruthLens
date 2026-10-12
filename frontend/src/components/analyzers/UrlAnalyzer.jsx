import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { analyzeUrl } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Lightning, Link as LinkIcon } from "@phosphor-icons/react";

export default function UrlAnalyzer({ onScanning, onResult, scanning }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");

  const submit = async () => {
    if (!/^https?:\/\//.test(url)) {
      toast.error("Enter a full URL with http(s)://");
      return;
    }
    onScanning(true);
    try {
      const res = await analyzeUrl(url.trim());
      onResult(res);
      toast.success("Analysis complete");
    } catch (e) {
      onScanning(false);
      toast.error(e?.response?.data?.detail || "Analysis failed");
    }
  };

  return (
    <div data-testid="url-analyzer" className="space-y-4">
      <p className="tl-mono text-[11px] uppercase tracking-[0.25em] text-white/50">{t("dashboard.fetch_url")}</p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon size={14} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("dashboard.url_placeholder")}
            data-testid="url-input"
            className="rounded-none bg-black border-white/15 pl-9 text-white placeholder:text-white/30 focus-visible:ring-[#00E5FF] focus-visible:ring-1 focus-visible:ring-offset-0"
          />
        </div>
        <Button
          onClick={submit}
          disabled={scanning}
          data-testid="url-analyze-btn"
          className="rounded-none bg-[#00E5FF] hover:bg-white text-black tl-mono text-[11px] uppercase tracking-[0.25em] font-bold px-5"
        >
          <Lightning size={14} weight="bold" className="mr-2" />
          {scanning ? t("dashboard.fetching") : t("dashboard.analyze_url")}
        </Button>
      </div>
      <p className="tl-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
        {t("dashboard.url_disclaimer")}
      </p>
    </div>
  );
}
