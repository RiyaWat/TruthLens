import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSettings, saveSettings, testWebhook } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, FloppyDisk, Pulse, Globe } from "@phosphor-icons/react";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [webhook, setWebhook] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSettings().then(s => setWebhook(s.webhook_url || "")).catch(() => {});
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      await saveSettings(webhook.trim() || null);
      toast.success(t("settings.saved"));
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    try {
      const res = await testWebhook();
      toast.success(`${t("settings.test_ok")} (HTTP ${res.status})`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Test failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Header />
      <main className="px-6 lg:px-12 py-12 max-w-3xl mx-auto" data-testid="settings-page">
        <Link to="/" className="tl-mono text-xs uppercase tracking-[0.3em] text-white/60 hover:text-[#00E5FF] inline-flex items-center gap-2 mb-8">
          <ArrowLeft size={14} weight="bold" /> back
        </Link>
        <div className="mb-10">
          <p className="tl-mono text-xs uppercase tracking-[0.3em] text-[#00E5FF] mb-3">{t("settings.label")}</p>
          <h1 className="tl-display text-5xl font-black leading-[0.95]">{t("settings.title")}</h1>
          <p className="text-white/65 mt-4">{t("settings.subtitle")}</p>
        </div>

        <section className="border border-white/10 bg-[#0E0E0E] p-6">
          <p className="tl-mono text-[10px] uppercase tracking-[0.3em] text-[#00E5FF] mb-3">{t("settings.webhook_label")}</p>
          <Input
            value={webhook}
            onChange={(e) => setWebhook(e.target.value)}
            placeholder={t("settings.webhook_placeholder")}
            data-testid="settings-webhook-input"
            className="rounded-none bg-black border-white/15 text-white placeholder:text-white/30 focus-visible:ring-[#00E5FF] focus-visible:ring-1 focus-visible:ring-offset-0"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={save} disabled={busy} data-testid="settings-save-btn"
              className="rounded-none bg-[#00E5FF] hover:bg-white text-black tl-mono text-[11px] uppercase tracking-[0.25em] font-bold px-5">
              <FloppyDisk size={14} weight="bold" className="mr-2" /> {t("settings.save")}
            </Button>
            <Button onClick={test} disabled={busy || !webhook} data-testid="settings-test-btn"
              className="rounded-none bg-transparent border border-white/15 hover:border-[#00E5FF] hover:text-[#00E5FF] text-white tl-mono text-[11px] uppercase tracking-[0.25em]">
              <Pulse size={14} weight="bold" className="mr-2" /> {t("settings.test")}
            </Button>
          </div>
          <p className="tl-mono text-[10px] uppercase tracking-[0.25em] text-white/40 mt-4">
            JSON sent: {`{ event, scan_id, score, classification, summary, report_url, text, ... }`}
          </p>
        </section>

        <section className="border border-white/10 bg-[#0E0E0E] p-6 mt-6">
          <p className="tl-mono text-[10px] uppercase tracking-[0.3em] text-[#00E5FF] mb-4">
            <Globe size={12} weight="bold" className="inline mr-1.5" /> {t("settings.language")}
          </p>
          <div className="flex flex-wrap gap-2">
            {["en", "es"].map(l => (
              <button
                key={l}
                onClick={() => i18n.changeLanguage(l)}
                data-testid={`settings-lang-${l}`}
                className={`px-4 py-2 border tl-mono text-[10px] uppercase tracking-[0.25em] transition-colors ${
                  (i18n.resolvedLanguage || "en").slice(0, 2) === l
                    ? "border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/5"
                    : "border-white/15 text-white/60 hover:border-white/30"
                }`}
              >
                {t(`settings.lang_${l}`)}
              </button>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
