import React from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import StatsBar from "@/components/StatsBar";
import AnalysisDashboard from "@/components/AnalysisDashboard";
import HowItWorks from "@/components/HowItWorks";
import ExtensionCTA from "@/components/ExtensionCTA";
import RecentScans from "@/components/RecentScans";
import Footer from "@/components/Footer";

export default function HomePage() {
  const { t } = useTranslation();
  return (
    <div data-testid="home-page" className="min-h-screen bg-[#0A0A0A] text-white">
      <Header />
      <main>
        <Hero />
        <StatsBar />
        <section id="analyze" className="relative px-6 lg:px-12 py-16 lg:py-24 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="mb-10 flex items-end justify-between flex-wrap gap-4">
              <div>
                <p className="tl-mono text-xs uppercase tracking-[0.3em] text-[#00E5FF] mb-3">
                  {t("dashboard.section_label")}
                </p>
                <h2 className="tl-display text-4xl sm:text-5xl font-black leading-none">
                  {t("dashboard.title")}
                </h2>
                <p className="text-white/60 mt-3 max-w-xl">
                  {t("dashboard.subtitle")}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AnalysisDashboard />
              </div>
              <div className="lg:col-span-1">
                <RecentScans />
              </div>
            </div>
          </div>
        </section>
        <HowItWorks />
        <ExtensionCTA />
      </main>
      <Footer />
    </div>
  );
}
