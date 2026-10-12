# TruthLens

I built TruthLens to get a quick second opinion on whether something online was made by a person or by AI. It's a web dashboard plus a Chrome extension: paste text, drop an image or a short video, or give it a link, and it comes back with an estimate (Human / AI / Deepfake / Uncertain), a 0–100 score, and the specific signals behind it.

**Live demo:** _coming soon_ (frontend on Vercel, API on Render)

## An honest note on how it works

TruthLens doesn't run a deepfake detector I trained myself. It sends the content to **Google Gemini** (a general-purpose AI model, `gemini-2.5-flash` by default) with a prompt I wrote that asks it to look for tell-tale signs: odd hands and lighting in images, flicker between video frames, repetitive phrasing in text. So every result is an **AI-assisted estimate, not proof**, and the app says so next to each verdict.

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

## Run it locally

```bash
# backend (Python 3.11)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cat > .env <<'EOF'
MONGO_URL="mongodb://localhost:27017"
DB_NAME="truthlens"
GEMINI_API_KEY="your-free-key-from-aistudio.google.com"
EOF
uvicorn server:app --port 8001 --reload
# check it: http://localhost:8001/api/health -> {"ok":true,"db":true,"ai":"configured"}

# frontend
cd ../frontend
echo 'REACT_APP_BACKEND_URL=http://localhost:8001' > .env
yarn install && yarn start
```

The app starts fine without `GEMINI_API_KEY`; analyses just return the "temporarily unavailable" message until you add one.

Extension: Chrome → `chrome://extensions` → Developer mode → "Load unpacked" → pick `extension/` (or download a pre-configured zip from `GET /api/extension/download`).

## Deploy it for free (Atlas → Render → Vercel)

1. **MongoDB Atlas:** create a free M0 cluster, a database user, and allow network access from `0.0.0.0/0`. Copy the `mongodb+srv://…` connection string.
2. **Gemini key:** [aistudio.google.com](https://aistudio.google.com) → Get API key → Create API key.
3. **Render (API):** New → Web Service → this repo, with
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - Instance Type: Free
   - the environment variables below (or use New → Blueprint, which reads `render.yaml`)
4. **Vercel (frontend):** Add New → Project → this repo, Root Directory `frontend`, env `REACT_APP_BACKEND_URL` = your Render URL (e.g. `https://truthlens-backend.onrender.com`). Build settings come from `frontend/vercel.json`.
5. Put your Vercel URL into `CORS_ORIGINS` on Render (any `https://truthlens….vercel.app` address is already allowed).

The free Render server sleeps after ~15 minutes idle; the first visit after that takes ~30 seconds, and the site shows a "waking up the server" banner and retries on its own.

## Environment variables

**Backend (Render)**

| Name | Required | What it is |
|---|---|---|
| `MONGO_URL` | yes | MongoDB connection string (Atlas `mongodb+srv://…`) |
| `DB_NAME` | yes | database name, `truthlens` |
| `GEMINI_API_KEY` | for analysis | Google AI Studio key (free tier). Without it the app runs but analysis is "temporarily unavailable" |
| `CORS_ORIGINS` | recommended | comma-separated allowed site URLs, e.g. `https://truthlens.vercel.app` (`*` = any) |
| `PYTHON_VERSION` | on Render | `3.11.9` |
| `GEMINI_TEXT_MODEL`, `GEMINI_VISION_MODEL` | no | default `gemini-2.5-flash` |
| `CORS_ORIGIN_REGEX` | no | overrides the built-in pattern that allows `https://truthlens*.vercel.app` and localhost |
| `PUBLIC_BACKEND_URL` | no | API URL baked into the downloadable extension (on Render it's detected automatically) |
| `RL_TEXT_HOUR`, `RL_IMAGE_DAY`, … , `RL_DISABLED` | no | rate-limit tuning (see `backend/ratelimit.py`) |

**Frontend (Vercel)**

| Name | What it is |
|---|---|
| `REACT_APP_BACKEND_URL` | the Render API URL, no trailing slash |

## Status

Still in progress. Next up: optional accounts (email magic link) so history syncs across devices.
