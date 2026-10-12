# TruthLens

I built TruthLens to get a quick second opinion on whether something online was made by a person or by AI. It's a web dashboard plus a Chrome extension: paste text, drop an image or a short video, or give it a link, and it comes back with an estimate (Human / AI / Deepfake / Uncertain), a 0–100 score, and the specific signals behind it.

**▶ Try it live:** [truth-lens-wine.vercel.app](https://truth-lens-wine.vercel.app)

## An honest note on how it works

TruthLens doesn't run a deepfake detector I trained myself. It sends the content to **Google Gemini** (a general-purpose AI model, `gemini-3.8-flash` by default) with a prompt I wrote that asks it to look for tell-tale signs: odd hands and lighting in images, flicker between video frames, repetitive phrasing in text. So every result is an **AI-assisted estimate, not proof**, and the app says so next to each verdict.

## What it does

- **Analyze** text, images, video (4 frames sampled) and web pages (visible text only)
- **Compare** two items side by side, or **bulk-scan** up to 12 at once
- **History** of your scans (anonymous, tied to a random id in your browser; no account needed)
- **Shareable reports**, PDF export and a share-card image per scan
- **Webhook alerts** (Slack, Discord, Zapier…) when something is flagged as a deepfake
- **English / Spanish** interface
- **Chrome extension** (Manifest V3): right-click an image or selected text to scan it in place
- **Rate limits** per browser session and per IP, so the free AI quota isn't drained
- If the AI is unavailable (no key, outage, quota used up) the app shows a friendly "analysis is temporarily unavailable" message instead of crashing

## Tech stack

- **Frontend:** React (Create React App + craco), Tailwind CSS, Radix UI, Framer Motion, i18next
- **Backend:** Python, FastAPI, Motor (async MongoDB), httpx, Pillow, PyAV/imageio (video frames), ReportLab (PDFs)
- **Database:** MongoDB (Atlas free tier); uploaded images/videos stored in GridFS
- **AI:** Google Gemini REST API
- **Hosting:** Vercel (frontend) + Render free web service (API) + MongoDB Atlas M0




