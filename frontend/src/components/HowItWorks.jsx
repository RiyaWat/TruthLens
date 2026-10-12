import React from "react";
import { ScanSmiley, Brain, FileMagnifyingGlass, ShieldCheck } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

export default function HowItWorks() {
  const { t } = useTranslation();
  const STEPS = [
    { n: "01", Icon: ScanSmiley,            title: t("how.step1_title"), body: t("how.step1_body") },
    { n: "02", Icon: Brain,                 title: t("how.step2_title"), body: t("how.step2_body") },
    { n: "03", Icon: FileMagnifyingGlass,   title: t("how.step3_title"), body: t("how.step3_body") },
    { n: "04", Icon: ShieldCheck,           title: t("how.step4_title"), body: t("how.step4_body") },
  ];

  return (
    <section
      id="how"
      data-testid="how-it-works"
      className="relative px-6 lg:px-12 py-24 lg:py-32 border-t border-white/10 bg-[#080808]"
    >
      <div className="absolute inset-0 tl-grid-bg tl-grid-fade opacity-30" />
      <div className="relative max-w-7xl mx-auto">
        <div className="mb-12 max-w-2xl">
          <p className="tl-mono text-xs uppercase tracking-[0.3em] text-[#00E5FF] mb-3">{t("how.label")}</p>
          <h2 className="tl-display text-4xl sm:text-5xl font-black leading-[0.95]">
            {t("how.title_1")}<br />{t("how.title_2")}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-white/10">
          {STEPS.map(({ n, Icon, title, body }) => (
            <div
              key={n}
              className="border-r border-b border-white/10 last:border-r-0 md:[&:nth-child(2)]:border-r-0 lg:[&:nth-child(2)]:border-r md:[&:nth-child(3)]:border-b-0 lg:[&:nth-child(3)]:border-b lg:[&:nth-child(4)]:border-b-0 md:[&:last-child]:border-b-0 p-6 lg:p-8 hover:bg-[#00E5FF]/[0.03] transition-colors"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="tl-mono text-[10px] uppercase tracking-[0.3em] text-white/30">{n}</span>
                <Icon size={22} weight="duotone" color="#00E5FF" />
              </div>
              <h3 className="tl-display text-xl font-bold mb-3">{title}</h3>
              <p className="text-sm text-white/65 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
