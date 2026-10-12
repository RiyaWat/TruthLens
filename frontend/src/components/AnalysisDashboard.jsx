import React from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TextT, ImageSquare, VideoCamera, Link as LinkIcon } from "@phosphor-icons/react";
import TextAnalyzer from "@/components/analyzers/TextAnalyzer";
import ImageAnalyzer from "@/components/analyzers/ImageAnalyzer";
import VideoAnalyzer from "@/components/analyzers/VideoAnalyzer";
import UrlAnalyzer from "@/components/analyzers/UrlAnalyzer";
import VerdictCard from "@/components/VerdictCard";
import UsageBadge from "@/components/UsageBadge";
import { useState } from "react";

export default function AnalysisDashboard() {
  const { t } = useTranslation();
  const [scan, setScan] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [active, setActive] = useState("text");

  const handleResult = (s) => {
    setScan(s);
    setScanning(false);
    window.dispatchEvent(new CustomEvent("tl-new-scan", { detail: s }));
  };

  const tabs = [
    { v: "text", icon: TextT, label: t("dashboard.tab_text") },
    { v: "image", icon: ImageSquare, label: t("dashboard.tab_image") },
    { v: "video", icon: VideoCamera, label: t("dashboard.tab_video") },
    { v: "url", icon: LinkIcon, label: t("dashboard.tab_url") },
  ];

  return (
    <div data-testid="analysis-dashboard" className="border border-white/10 bg-[#0E0E0E]">
      <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between gap-2">
        <p className="tl-mono text-[10px] uppercase tracking-[0.25em] text-white/50">// quota</p>
        <UsageBadge kind={active} />
      </div>
      <Tabs value={active} onValueChange={setActive} className="w-full">
        <TabsList className="w-full bg-transparent rounded-none border-b border-white/10 p-0 h-auto grid grid-cols-4 gap-0">
          {tabs.map(({ v, icon: Icon, label }) => (
            <TabsTrigger
              key={v}
              value={v}
              data-testid={`tab-${v}`}
              className="tl-tabs-trigger rounded-none border-r border-white/10 last:border-r-0 py-4 tl-mono text-[11px] uppercase tracking-[0.25em] text-white/60 data-[state=active]:shadow-none data-[state=active]:bg-[#00E5FF]/5 flex items-center gap-2 hover:text-white"
            >
              <Icon size={14} weight="bold" /> {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="p-6 lg:p-8 min-h-[420px]">
          <TabsContent value="text" className="mt-0">
            <TextAnalyzer onScanning={setScanning} onResult={handleResult} scanning={scanning} />
          </TabsContent>
          <TabsContent value="image" className="mt-0">
            <ImageAnalyzer onScanning={setScanning} onResult={handleResult} scanning={scanning} />
          </TabsContent>
          <TabsContent value="video" className="mt-0">
            <VideoAnalyzer onScanning={setScanning} onResult={handleResult} scanning={scanning} />
          </TabsContent>
          <TabsContent value="url" className="mt-0">
            <UrlAnalyzer onScanning={setScanning} onResult={handleResult} scanning={scanning} />
          </TabsContent>
        </div>
      </Tabs>

      {(scanning || scan) && (
        <div className="border-t border-white/10 p-6 lg:p-8 bg-[#0A0A0A]">
          <VerdictCard scan={scan} scanning={scanning} />
        </div>
      )}
    </div>
  );
}
