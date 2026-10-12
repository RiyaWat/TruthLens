# TruthLens Chrome Web Store Listing

## Name
**TruthLens — Deepfake & AI Detector**

## Short description (132 chars)
Right-click any image, text, or page for an AI-assisted estimate — HUMAN / AI / DEEPFAKE / UNCERTAIN.

## Detailed description
TruthLens asks a general AI model (Google Gemini) to check text, images, video, and URLs for signs of AI generation and returns an estimate with its reasons. It is a hint, not proof.

**What TruthLens does**
- 🔬 **Text** — estimates whether text was AI-written (Google Gemini)
- 🖼️ **Images** — looks for signs of AI-generated photos and deepfakes (Google Gemini)
- 🎥 **Video** — frame-sampled analysis for synthetic / manipulated clips
- 🌐 **URLs** — scrapes a public page and runs a trust-and-AI scan
- 📊 **Reports** — every scan gets a 0–100 synthetic score, classification, confidence, severity-graded forensic markers, and a downloadable PDF
- 🔗 **In-page overlay** — right-click any image or selected text to scan it without leaving the page
- 🌍 **Multi-language** — English + Spanish UI; auto-detects content language
- 🛎️ **Webhook alerts** — optional Slack/Discord/Make webhook fires when a DEEPFAKE is detected

**Privacy first**
- No account required. Anonymous session id stored locally.
- We never sell your data. We don't run third-party ads or trackers.
- See full privacy policy: https://truthlens.example/privacy

**For**
- Journalists & fact-checkers verifying suspicious media
- Researchers studying synthetic-content prevalence
- Anyone who wants a sanity check before believing a viral post

## Categories
- Productivity
- Tools

## Screenshots (1280×800 PNG · /app/docs/screenshots/)
1. `01-hero.png` — Landing page hero "See through the deepfake."
2. `02-analyze.png` — Live Analysis dashboard mid-scan with the cyan laser
3. `03-verdict.png` — Verdict card showing AI 95%, classification, markers, reasoning
4. `04-compare.png` — Compare mode side-by-side (Subject A vs Subject B + winner)
5. `05-bulk.png` — Bulk scan queue with aggregate roll-up
6. `06-history.png` — History page with type filters
7. `07-extension-popup.png` — Browser extension popup
8. `08-extension-overlay.png` — In-page verdict overlay on a sample news article

## Promotional tile (440×280)
`promo-440x280.png` — TruthLens logo on forensic grid + tagline "See through the deepfake." (✅ generated)

## Marquee (1400×560)
`marquee-1400x560.png` — Big TRUTHLENS wordmark, deepfake ⨯ verdict mock (✅ generated)

## Permissions justification
- `contextMenus` — adds "TruthLens: Scan this image / selected text / page" right-click items.
- `activeTab` — read the current tab's URL when the user clicks "Scan this page".
- `storage` — persist user settings (API base, anonymous session id).
- `scripting` — inject the verdict overlay content script when the user invokes a scan.
- `<all_urls>` — required so the extension works on any site the user visits.

## Single purpose
TruthLens has a single purpose: detect AI-generated and deepfake content the user encounters on the web and present a forensic verdict.

## Distribution
- Public listing on Chrome Web Store
- Source available for review at https://github.com/your-org/truthlens

## Support
- support@truthlens.example
- Issues: https://github.com/your-org/truthlens/issues
