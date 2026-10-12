# TruthLens (in progress)

A browser extension and web dashboard that flag deepfakes and AI-generated content.

- **Chrome extension (Manifest V3)** in `extension/`: right-click an image, selected text or a page link to scan it; results show in a popup and an on-page overlay.
- **Web dashboard** in `frontend/` (React + Tailwind): analyze text, images, links and video, compare two items, bulk-scan, history, PDF reports, English/Spanish.
- **API** in `backend/` (FastAPI + MongoDB): sends content to Google's Gemini API with a forensic prompt and returns a score, verdict (Human / AI / Deepfake / Uncertain) and the markers behind it.

Status: still in progress. The verdicts come from a general AI model, not a trained deepfake detector, so treat them as hints, not proof.

## Run it locally

```bash
# backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cat > .env <<'EOF'
MONGO_URL="mongodb://localhost:27017"
DB_NAME="truthlens"
GEMINI_API_KEY="your-free-key-from-aistudio.google.com"
CORS_ORIGINS="*"
EOF
uvicorn server:app --port 8001 --reload

# frontend
cd ../frontend
echo 'REACT_APP_BACKEND_URL=http://localhost:8001' > .env
yarn install && yarn start
```

Load the extension: Chrome → `chrome://extensions` → Developer mode → "Load unpacked" → pick `extension/`
(or download a pre-configured zip from `GET /api/extension/download`).

## Environment variables (backend)

| Name | Required | What it is |
|---|---|---|
| `MONGO_URL`, `DB_NAME` | yes | MongoDB connection (free MongoDB Atlas M0 works) |
| `GEMINI_API_KEY` | yes | Google AI Studio key (free tier) for the analysis |
| `GEMINI_TEXT_MODEL`, `GEMINI_VISION_MODEL` | no | default `gemini-2.5-flash` |
| `CORS_ORIGINS` | no | comma-separated allowed origins, default `*` |
| `PUBLIC_BACKEND_URL` | no | public API URL baked into the downloadable extension |

Uploaded images/videos are stored in the same MongoDB (GridFS).

## Deploying for free

- Frontend on Vercel: Root Directory `frontend`, build `CI=false yarn build`, output `build` (already in `frontend/vercel.json`), env `REACT_APP_BACKEND_URL`.
- Backend: needs a long-running Python host (Render / Railway / Fly.io free tier), not Vercel.
- Database: MongoDB Atlas M0.
