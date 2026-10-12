import React from "react";
import { Link, NavLink } from "react-router-dom";
import { Eye, DownloadSimple, Globe } from "@phosphor-icons/react";
import { extensionUrl } from "@/lib/api";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const { t, i18n } = useTranslation();
  const setLang = (lng) => i18n.changeLanguage(lng);
  const cur = (i18n.resolvedLanguage || i18n.language || "en").slice(0, 2);
  const linkCls = "hover:text-[#00E5FF] transition-colors";

  return (
    <header
      data-testid="site-header"
      className="tl-glass sticky top-0 z-50 border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-4 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5" data-testid="logo-link">
          <div className="w-8 h-8 border border-[#00E5FF] flex items-center justify-center bg-[#00E5FF]/10">
            <Eye size={18} weight="duotone" color="#00E5FF" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="tl-display text-lg font-black tracking-tight">TRUTHLENS</span>
            <span className="tl-mono text-[10px] uppercase tracking-[0.25em] text-[#00E5FF]">v1.0</span>
          </div>
        </Link>
        <nav className="hidden lg:flex items-center gap-6 tl-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
          <a href="/#analyze" className={linkCls} data-testid="nav-analyze">{t("nav.analyze")}</a>
          <NavLink to="/compare" className={linkCls} data-testid="nav-compare">{t("nav.compare")}</NavLink>
          <NavLink to="/bulk" className={linkCls} data-testid="nav-bulk">{t("nav.bulk")}</NavLink>
          <NavLink to="/history" className={linkCls} data-testid="nav-history">{t("nav.history")}</NavLink>
          <NavLink to="/settings" className={linkCls} data-testid="nav-settings">{t("nav.settings")}</NavLink>
          <a href="/#how" className={linkCls} data-testid="nav-how">{t("nav.how")}</a>
        </nav>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              data-testid="lang-switcher"
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-white/15 hover:border-[#00E5FF] tl-mono text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-[#00E5FF] transition-colors"
            >
              <Globe size={12} weight="bold" />
              {cur === "es" ? "ES" : "EN"}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-[#0E0E0E] border border-white/15 rounded-none text-white tl-mono text-[11px] uppercase tracking-[0.2em] min-w-[120px]"
            >
              <DropdownMenuItem
                data-testid="lang-en"
                onClick={() => setLang("en")}
                className={`focus:bg-[#00E5FF]/10 rounded-none cursor-pointer ${cur === "en" ? "text-[#00E5FF]" : ""}`}
              >
                English
              </DropdownMenuItem>
              <DropdownMenuItem
                data-testid="lang-es"
                onClick={() => setLang("es")}
                className={`focus:bg-[#00E5FF]/10 rounded-none cursor-pointer ${cur === "es" ? "text-[#00E5FF]" : ""}`}
              >
                Español
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <NavLink
            to="/login"
            data-testid="nav-login"
            className="hidden sm:inline-flex items-center px-3 py-2 border border-white/15 hover:border-[#00E5FF] hover:text-[#00E5FF] tl-mono text-[10px] uppercase tracking-[0.25em] text-white/70 transition-colors"
          >
            {t("nav.login")}
          </NavLink>
          <a
            href={extensionUrl}
            data-testid="header-download-btn"
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-[#00E5FF] hover:bg-white text-black tl-mono text-xs uppercase tracking-[0.2em] font-bold transition-colors"
          >
            <DownloadSimple size={14} weight="bold" /> {t("nav.getExtension")}
          </a>
        </div>
      </div>
    </header>
  );
}
