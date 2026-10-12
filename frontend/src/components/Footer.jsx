import React from "react";
import { Eye } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer
      data-testid="site-footer"
      className="px-6 lg:px-12 py-10 border-t border-white/10 bg-[#080808]"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 border border-[#00E5FF] flex items-center justify-center bg-[#00E5FF]/10">
            <Eye size={14} weight="duotone" color="#00E5FF" />
          </div>
          <span className="tl-display text-sm font-black tracking-tight">TRUTHLENS</span>
          <span className="tl-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
            {t("footer.tag")}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/privacy" className="tl-mono text-[10px] uppercase tracking-[0.25em] text-white/40 hover:text-[#00E5FF]" data-testid="footer-privacy">
            Privacy
          </Link>
          <p className="tl-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
            © {new Date().getFullYear()} · forensic v1
          </p>
        </div>
      </div>
    </footer>
  );
}
