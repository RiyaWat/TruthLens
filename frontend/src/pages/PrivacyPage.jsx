import React from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft } from "@phosphor-icons/react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Header />
      <main className="px-6 lg:px-12 py-12 max-w-3xl mx-auto" data-testid="privacy-page">
        <Link to="/" className="tl-mono text-xs uppercase tracking-[0.3em] text-white/60 hover:text-[#00E5FF] inline-flex items-center gap-2 mb-8">
          <ArrowLeft size={14} weight="bold" /> back
        </Link>
        <div className="mb-10">
          <p className="tl-mono text-xs uppercase tracking-[0.3em] text-[#00E5FF] mb-3">// LEGAL</p>
          <h1 className="tl-display text-5xl font-black leading-[0.95]">Privacy Policy</h1>
          <p className="tl-mono text-[10px] uppercase tracking-[0.25em] text-white/40 mt-3">last updated: 2026-02-05</p>
        </div>
        <article className="space-y-6 text-white/80 leading-relaxed text-sm sm:text-base">
          <Section title="1 · What TruthLens does">
            TruthLens is an AI-assisted tool for spotting AI-generated content. It analyzes <em>text, images, video and URLs</em> you submit and returns a verdict
            (HUMAN / AI / DEEPFAKE / UNCERTAIN) with reasoning.
          </Section>
          <Section title="2 · What we collect">
            <ul className="list-disc list-outside pl-5 space-y-1.5">
              <li>An anonymous device-bound <strong>session id</strong> (UUID) generated locally in your browser.</li>
              <li>The <strong>content you submit</strong> for scanning (text body, image bytes, URL, sampled video frames). This is sent to our servers and to the chosen LLM provider for analysis.</li>
              <li>The <strong>scan result</strong> (score, classification, reasoning, markers, language) tied to your session id.</li>
              <li>Aggregate counters (total scans, deepfakes flagged) for the public stats bar — no per-user data is shown publicly.</li>
            </ul>
          </Section>
          <Section title="3 · What we don't collect">
            We don't collect names, contact info, IP-based profiles, third-party cookies, or marketing data. The Chrome extension only fires when
            you explicitly trigger it.
          </Section>
          <Section title="4 · Where things go">
            <ul className="list-disc list-outside pl-5 space-y-1.5">
              <li>Submitted content is processed by the <strong>Google Gemini API</strong> for text, URL, image and video analysis.</li>
              <li>Original images and videos are stored in the TruthLens database for the duration of the session.</li>
              <li>If you configure a <strong>webhook URL</strong>, we POST a JSON payload to it whenever a DEEPFAKE is detected. You control that URL.</li>
            </ul>
          </Section>
          <Section title="5 · Retention & deletion">
            Scans are retained while the session id remains in your browser's localStorage. Clearing site data wipes the link between you and
            stored scans. To request hard deletion of stored bytes, email <span className="tl-mono text-[#00E5FF]">privacy@truthlens.example</span> with your session id.
          </Section>
          <Section title="6 · Children">
            TruthLens is not intended for children under 13.
          </Section>
          <Section title="7 · Contact">
            Questions: <span className="tl-mono text-[#00E5FF]">privacy@truthlens.example</span>
          </Section>
        </article>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="tl-display text-xl font-bold mb-2">{title}</h2>
      <div className="text-white/75">{children}</div>
    </section>
  );
}
