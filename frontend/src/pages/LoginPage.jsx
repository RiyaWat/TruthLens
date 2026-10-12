import React, { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { ArrowLeft, EnvelopeSimple, Hourglass } from "@phosphor-icons/react";

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Header />
      <main className="px-6 lg:px-12 py-16 max-w-2xl mx-auto" data-testid="login-page">
        <Link to="/" className="tl-mono text-xs uppercase tracking-[0.3em] text-white/60 hover:text-[#00E5FF] inline-flex items-center gap-2 mb-8">
          <ArrowLeft size={14} weight="bold" /> {t("login.back")}
        </Link>
        <div className="mb-10">
          <p className="tl-mono text-xs uppercase tracking-[0.3em] text-[#00E5FF] mb-3">{t("login.label")}</p>
          <h1 className="tl-display text-5xl font-black leading-[0.95]">
            {t("login.title_1")}<br /><span className="text-[#00E5FF]">{t("login.title_2")}</span>
          </h1>
          <p className="text-white/65 mt-4">{t("login.subtitle")}</p>
        </div>

        <div className="border border-white/10 bg-[#0E0E0E] p-6">
          <div className="inline-flex items-center gap-2 px-2 py-1 border border-[#FFB800] text-[#FFB800] mb-4">
            <Hourglass size={12} weight="bold" />
            <span className="tl-mono text-[10px] uppercase tracking-[0.25em] font-bold">{t("login.soon")}</span>
          </div>
          <p className="tl-mono text-[10px] uppercase tracking-[0.3em] text-[#00E5FF] mb-2">EMAIL</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <EnvelopeSimple size={14} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled
                data-testid="login-email-input"
                className="rounded-none bg-black border-white/15 pl-9 text-white placeholder:text-white/20 disabled:opacity-60"
              />
            </div>
            <Button
              disabled
              data-testid="login-submit"
              className="rounded-none bg-[#00E5FF]/40 text-black/60 tl-mono text-[11px] uppercase tracking-[0.25em] font-bold px-5 cursor-not-allowed"
            >
              Send link
            </Button>
          </div>
          <p className="tl-mono text-[10px] uppercase tracking-[0.25em] text-white/40 mt-4">
            // we'll never send marketing email — link is a one-time login token
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
