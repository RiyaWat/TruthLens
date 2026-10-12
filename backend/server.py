"""TruthLens FastAPI backend — deepfake & AI-content detection."""
from fastapi import FastAPI, APIRouter, HTTPException, Body, Response, Request
from fastapi.responses import FileResponse, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, uuid, base64, io, logging, zipfile, tempfile, asyncio, re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime, timezone

import httpx
from bs4 import BeautifulSoup
from PIL import Image
import imageio.v3 as iio
from langdetect import detect_langs, DetectorFactory
DetectorFactory.seed = 0


# Local helpers
from storage import init_storage, put_object, get_object, APP_NAME as STORAGE_APP
from prefilter import text_prefilter, image_prefilter_b64
from og import render_og
from ratelimit import check_and_consume, usage_for, ensure_indexes as ensure_rl_indexes

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# AI provider: Google Gemini API (free tier key from https://aistudio.google.com/apikey)
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
GEMINI_TEXT_MODEL = os.environ.get('GEMINI_TEXT_MODEL', 'gemini-3.8-flash')
GEMINI_VISION_MODEL = os.environ.get('GEMINI_VISION_MODEL', 'gemini-3.8-flash')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'truthlens')

# Short server-selection timeout so a bad/missing DB shows up as a clear error
# (and in /api/health) instead of hanging requests for 30s.
client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=8000)
db = client[DB_NAME]

app = FastAPI(title="TruthLens API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
log = logging.getLogger("truthlens")

# ----------------- Models -----------------
ScanType = Literal["text", "image", "video", "url"]
Verdict = Literal["HUMAN", "AI", "DEEPFAKE", "UNCERTAIN"]


class Marker(BaseModel):
    label: str
    detail: str
    severity: Literal["info", "warn", "danger"] = "info"


class ScanResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    type: ScanType
    score: int  # 0-100, % AI/synthetic
    classification: Verdict
    confidence: int  # 0-100
    summary: str
    reasoning: str
    markers: List[Marker] = []
    preview: Optional[str] = None  # short text snippet, image filename, or url
    language: Optional[str] = None  # detected language (e.g. "English")
    storage_path: Optional[str] = None  # object-storage path of the original (image/video)
    prefilter_flags: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TextRequest(BaseModel):
    session_id: str
    content: str


class ImageRequest(BaseModel):
    session_id: str
    image_base64: str
    filename: Optional[str] = None


class VideoRequest(BaseModel):
    session_id: str
    video_base64: str
    filename: Optional[str] = None


class UrlRequest(BaseModel):
    session_id: str
    url: str


# ----------------- LLM helpers -----------------
SYSTEM_TEXT = (
    "You are TruthLens, a forensic AI-content detector. Given a TEXT passage in ANY language, judge how "
    "likely it was written by an AI model versus a human. Adapt your linguistic-forensics reasoning to "
    "the detected language. Respond ONLY with strict JSON in this schema:\n"
    "{\"score\": 0-100 (probability AI-generated, integer), "
    "\"classification\": one of [\"HUMAN\",\"AI\",\"UNCERTAIN\"], "
    "\"confidence\": 0-100 integer, "
    "\"language\": natural language name of the input (e.g. \"English\", \"Spanish\", \"Hindi\"), "
    "\"summary\": one short sentence verdict (in English), "
    "\"reasoning\": 2-4 sentence explanation citing linguistic patterns (in English), "
    "\"markers\": [{\"label\": short tag, \"detail\": evidence, \"severity\": \"info|warn|danger\"}] (3-5 items)}"
)

SYSTEM_IMAGE = (
    "You are TruthLens, a forensic deepfake & AI-image detector. Examine the IMAGE and judge whether it is "
    "a real photograph, a generative-AI image (Stable Diffusion / Midjourney / DALL-E), or a deepfake of a real person. "
    "Look for: anatomical errors (hands, eyes, ears, teeth), background inconsistencies, lighting/shadow mismatch, "
    "skin smoothness, text artifacts, frequency artifacts, GAN/diffusion fingerprints. "
    "Respond ONLY with strict JSON:\n"
    "{\"score\": 0-100 (probability synthetic/AI, integer), "
    "\"classification\": one of [\"HUMAN\",\"AI\",\"DEEPFAKE\",\"UNCERTAIN\"], "
    "\"confidence\": 0-100 integer, "
    "\"language\": \"N/A\" for images, "
    "\"summary\": one short sentence verdict, "
    "\"reasoning\": 2-4 sentences explaining technical evidence, "
    "\"markers\": [{\"label\": short tag, \"detail\": evidence, \"severity\": \"info|warn|danger\"}] (3-6 items)}"
)

SYSTEM_VIDEO = (
    "You are TruthLens, a forensic deepfake video detector. You will receive several frames sampled from a video. "
    "Judge whether the video appears to be a deepfake, generative-AI video, or authentic recording. "
    "Look across frames for: temporal inconsistencies, face/body warping, blinking patterns, lip-sync mismatch, "
    "lighting flicker, edge artifacts. Respond ONLY with strict JSON:\n"
    "{\"score\": 0-100 (probability synthetic/deepfake, integer), "
    "\"classification\": one of [\"HUMAN\",\"AI\",\"DEEPFAKE\",\"UNCERTAIN\"], "
    "\"confidence\": 0-100 integer, "
    "\"summary\": one short sentence verdict, "
    "\"reasoning\": 2-4 sentences citing temporal/visual evidence across frames, "
    "\"markers\": [{\"label\": short tag, \"detail\": evidence, \"severity\": \"info|warn|danger\"}] (3-6 items)}"
)

SYSTEM_URL = (
    "You are TruthLens, examining a webpage's textual content (in ANY language) for AI-generation, "
    "misinformation, or manipulation patterns. Given the page TITLE and BODY text, evaluate AI-likelihood "
    "and trustworthiness signals. Respond ONLY with strict JSON:\n"
    "{\"score\": 0-100 (probability AI-generated/manipulated, integer), "
    "\"classification\": one of [\"HUMAN\",\"AI\",\"UNCERTAIN\"], "
    "\"confidence\": 0-100 integer, "
    "\"language\": natural language name of the page body, "
    "\"summary\": one short sentence verdict (English), "
    "\"reasoning\": 2-4 sentences summarizing language and trust signals (English), "
    "\"markers\": [{\"label\": short tag, \"detail\": evidence, \"severity\": \"info|warn|danger\"}] (3-6 items)}"
)


def _extract_json(raw: str) -> dict:
    """Pull JSON object from a model response."""
    import json
    s = raw.strip()
    # strip markdown fences
    s = re.sub(r"^```(?:json)?\s*|\s*```$", "", s, flags=re.MULTILINE).strip()
    # find first { ... last }
    a, b = s.find("{"), s.rfind("}")
    if a != -1 and b != -1:
        s = s[a:b + 1]
    return json.loads(s)


def _normalize(parsed: dict, allow_deepfake: bool = True) -> dict:
    score = int(parsed.get("score", 50))
    score = max(0, min(100, score))
    cls = str(parsed.get("classification", "UNCERTAIN")).upper()
    if cls not in {"HUMAN", "AI", "DEEPFAKE", "UNCERTAIN"} or (cls == "DEEPFAKE" and not allow_deepfake):
        cls = "AI" if cls == "DEEPFAKE" else cls
        if cls not in {"HUMAN", "AI", "UNCERTAIN"}:
            cls = "UNCERTAIN"
    conf = int(parsed.get("confidence", 70))
    conf = max(0, min(100, conf))
    markers = parsed.get("markers", []) or []
    clean_markers = []
    for m in markers[:6]:
        if not isinstance(m, dict):
            continue
        sev = str(m.get("severity", "info")).lower()
        if sev not in {"info", "warn", "danger"}:
            sev = "info"
        clean_markers.append(Marker(
            label=str(m.get("label", ""))[:60],
            detail=str(m.get("detail", ""))[:240],
            severity=sev,
        ))
    lang = parsed.get("language")
    lang_str = str(lang)[:40] if lang else None
    return {
        "score": score,
        "classification": cls,
        "confidence": conf,
        "summary": str(parsed.get("summary", ""))[:300],
        "reasoning": str(parsed.get("reasoning", ""))[:1200],
        "markers": clean_markers,
        "language": lang_str,
    }


AI_UNAVAILABLE_MSG = (
    "Analysis is temporarily unavailable (the AI service isn't reachable right now). "
    "Please try again in a few minutes."
)
AI_BUSY_MSG = (
    "Analysis is temporarily unavailable: the free AI quota is used up for the moment. "
    "Please try again in a minute or two."
)


class AIUnavailable(Exception):
    """The AI provider is not configured, down, or quota-limited."""

    def __init__(self, message: str = AI_UNAVAILABLE_MSG, cause: str = ""):
        super().__init__(message)
        self.message = message
        self.cause = cause


def _ai_http_error(e: Exception) -> HTTPException:
    """Turn any analysis failure into a friendly 503 the UI can show as-is."""
    if isinstance(e, HTTPException):
        return e
    if isinstance(e, AIUnavailable):
        log.warning(f"AI unavailable: {e.cause or e.message}")
        return HTTPException(503, e.message)
    log.exception("analysis failed")
    return HTTPException(503, AI_UNAVAILABLE_MSG)


def _require_ai() -> None:
    if not GEMINI_API_KEY:
        raise HTTPException(503, AI_UNAVAILABLE_MSG)


async def _gemini(model: str, system: str, parts: list) -> str:
    """Call the Gemini generateContent REST endpoint and return the reply text."""
    if not GEMINI_API_KEY:
        raise AIUnavailable(cause="GEMINI_API_KEY is not set")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
    }
    try:
        async with httpx.AsyncClient(timeout=90) as http:
            r = await http.post(url, params={"key": GEMINI_API_KEY}, json=body)
    except httpx.HTTPError as e:
        raise AIUnavailable(cause=f"network error: {type(e).__name__}")
    if r.status_code == 429:
        raise AIUnavailable(AI_BUSY_MSG, cause="Gemini 429 (quota/rate limit)")
    if r.status_code >= 400:
        raise AIUnavailable(cause=f"Gemini HTTP {r.status_code}: {r.text[:300]}")
    try:
        data = r.json()
    except ValueError:
        raise AIUnavailable(cause="Gemini returned non-JSON")
    cands = data.get("candidates") or []
    if not cands:
        raise AIUnavailable(cause=f"Gemini returned no candidates: {str(data)[:300]}")
    return "".join(p.get("text", "") for p in cands[0].get("content", {}).get("parts", []))


async def _llm_text(system: str, user_text: str, model: Optional[str] = None) -> dict:
    resp = await _gemini(model or GEMINI_TEXT_MODEL, system, [{"text": user_text}])
    return _extract_json(resp)


async def _llm_image(system: str, user_text: str, images_b64: List[str]) -> dict:
    parts = [{"text": user_text}] + [
        {"inline_data": {"mime_type": "image/jpeg", "data": b}} for b in images_b64
    ]
    resp = await _gemini(GEMINI_VISION_MODEL, system, parts)
    return _extract_json(resp)


# ----------------- Persistence helpers -----------------
async def _save_scan(scan: ScanResult) -> ScanResult:
    doc = scan.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['markers'] = [m.model_dump() if hasattr(m, 'model_dump') else m for m in scan.markers]
    await db.scans.insert_one(doc)
    return scan


async def _store_image(session_id: str, jpeg_b64: str) -> Optional[str]:
    """Upload original image to object storage. Returns the storage path or None."""
    try:
        raw = base64.b64decode(jpeg_b64)
        path = f"{STORAGE_APP}/sessions/{session_id}/{uuid.uuid4()}.jpg"
        result = await asyncio.to_thread(put_object, path, raw, "image/jpeg")
        return result.get("path") if result else None
    except Exception as e:
        log.warning(f"_store_image failed: {e}")
        return None


async def _store_video(session_id: str, video_b64: str, filename: Optional[str] = None) -> Optional[str]:
    try:
        raw = base64.b64decode(video_b64)
        ext = "mp4"
        if filename and "." in filename:
            ext = filename.rsplit(".", 1)[-1].lower()[:5] or "mp4"
        path = f"{STORAGE_APP}/sessions/{session_id}/{uuid.uuid4()}.{ext}"
        ct = {"mp4": "video/mp4", "mov": "video/quicktime", "webm": "video/webm"}.get(ext, "application/octet-stream")
        result = await asyncio.to_thread(put_object, path, raw, ct)
        return result.get("path") if result else None
    except Exception as e:
        log.warning(f"_store_video failed: {e}")
        return None


async def _maybe_fire_webhook(scan: ScanResult) -> None:
    """If the session has a webhook configured AND classification is DEEPFAKE, POST to it."""
    if scan.classification != "DEEPFAKE":
        return
    cfg = await db.settings.find_one({"session_id": scan.session_id}, {"_id": 0})
    url = (cfg or {}).get("webhook_url")
    if not url:
        return
    public = _public_backend_url() or ""
    payload = {
        "service": "TruthLens",
        "event": "deepfake_detected",
        "scan_id": scan.id,
        "type": scan.type,
        "score": scan.score,
        "classification": scan.classification,
        "confidence": scan.confidence,
        "summary": scan.summary,
        "preview": scan.preview,
        "report_url": f"{public.rstrip('/')}/report/{scan.id}" if public else None,
        "language": scan.language,
        "created_at": scan.created_at.isoformat() if hasattr(scan.created_at, "isoformat") else scan.created_at,
        # Slack-compatible fields
        "text": f"🚨 TruthLens flagged a *DEEPFAKE* — {scan.score}% synthetic ({scan.type}). {scan.summary}",
    }
    try:
        async with httpx.AsyncClient(timeout=8) as cx:
            await cx.post(url, json=payload)
    except Exception as e:
        log.warning(f"webhook fire failed: {e}")


def _public_scan(doc: dict) -> dict:
    doc.pop("_id", None)
    if isinstance(doc.get("created_at"), str):
        try:
            doc["created_at"] = datetime.fromisoformat(doc["created_at"])
        except Exception:
            pass
    return doc


# ----------------- Image helpers -----------------
LANG_CODE_TO_NAME = {
    "en": "English", "es": "Spanish", "fr": "French", "de": "German", "it": "Italian",
    "pt": "Portuguese", "ru": "Russian", "ja": "Japanese", "ko": "Korean", "zh-cn": "Chinese (Simplified)",
    "zh-tw": "Chinese (Traditional)", "ar": "Arabic", "hi": "Hindi", "bn": "Bengali", "tr": "Turkish",
    "nl": "Dutch", "pl": "Polish", "sv": "Swedish", "uk": "Ukrainian", "vi": "Vietnamese",
    "id": "Indonesian", "th": "Thai", "he": "Hebrew", "fa": "Persian", "ur": "Urdu",
    "ta": "Tamil", "te": "Telugu", "mr": "Marathi", "gu": "Gujarati", "ml": "Malayalam",
}


def _detect_language(text: str) -> Optional[str]:
    """Local fallback language detection."""
    try:
        sample = (text or "")[:1500].strip()
        if len(sample) < 8:
            return None
        langs = detect_langs(sample)
        if not langs:
            return None
        top = langs[0]
        return LANG_CODE_TO_NAME.get(top.lang.lower(), top.lang)
    except Exception:
        return None


def _ensure_jpeg_b64(b64: str, max_side: int = 1024) -> str:
    raw = base64.b64decode(b64)
    img = Image.open(io.BytesIO(raw))
    # animated -> first frame
    try:
        img.seek(0)
    except Exception:
        pass
    if img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGB")
    elif img.mode != "RGB":
        img = img.convert("RGB")
    w, h = img.size
    if max(w, h) > max_side:
        scale = max_side / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


def _frame_to_jpeg_b64(frame, size: int = 1024) -> str:
    pil = Image.fromarray(frame)
    if pil.mode != "RGB":
        pil = pil.convert("RGB")
    pil.thumbnail((size, size))
    buf = io.BytesIO()
    pil.save(buf, format="JPEG", quality=80)
    return base64.b64encode(buf.getvalue()).decode()


def _extract_video_frames(b64: str, n_frames: int = 4, max_scan: int = 240) -> List[str]:
    """Sample up to n_frames evenly across the first `max_scan` decoded frames.

    Frames are shrunk to small JPEGs as they are decoded so memory stays low
    (the free hosting tier has 512 MB).
    """
    raw = base64.b64decode(b64)
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
        f.write(raw)
        path = f.name
    try:
        thumbs: List[str] = []
        for i, frame in enumerate(iio.imiter(path, plugin="pyav")):
            if i >= max_scan:
                break
            thumbs.append(_frame_to_jpeg_b64(frame, 768))
        if not thumbs:
            return []
        if len(thumbs) <= n_frames:
            return thumbs
        idxs = [int((i + 0.5) * len(thumbs) / n_frames) for i in range(n_frames)]
        return [thumbs[min(i, len(thumbs) - 1)] for i in idxs]
    finally:
        try:
            os.unlink(path)
        except Exception:
            pass


# ----------------- Routes -----------------
@api.get("/")
async def root():
    return {"app": "TruthLens", "status": "online", "version": "1.0.0"}


@api.get("/health")
async def health():
    """Liveness + config check: is the DB reachable, is the AI key set?"""
    db_ok = False
    try:
        await asyncio.wait_for(client.admin.command("ping"), timeout=8)
        db_ok = True
    except Exception as e:
        log.warning(f"health: db ping failed: {type(e).__name__}")
    return {"ok": True, "db": db_ok, "ai": "configured" if GEMINI_API_KEY else "missing"}


@api.post("/analyze/text", response_model=ScanResult)
async def analyze_text(req: TextRequest, request: Request = None):
    if not req.content or len(req.content.strip()) < 20:
        raise HTTPException(400, "Text must be at least 20 characters")
    if len(req.content) > 20000:
        req.content = req.content[:20000]
    _require_ai()
    await check_and_consume(db, "text", req.session_id, request)
    pf = text_prefilter(req.content)
    try:
        parsed = await _llm_text(SYSTEM_TEXT, f"Analyze this text:\n\n{req.content}")
    except Exception as e:
        raise _ai_http_error(e)
    norm = _normalize(parsed, allow_deepfake=False)
    if not norm.get("language"):
        norm["language"] = _detect_language(req.content)
    # apply conservative pre-filter score boost (capped) only if LLM was uncertain/low
    if pf["flags"] and norm["score"] < 90:
        norm["score"] = min(100, norm["score"] + int(pf["boost"]))
        if norm["score"] >= 70 and norm["classification"] == "UNCERTAIN":
            norm["classification"] = "AI"
    scan = ScanResult(
        session_id=req.session_id, type="text",
        preview=req.content[:160],
        prefilter_flags=pf["flags"],
        **norm,
    )
    await _save_scan(scan)
    await _maybe_fire_webhook(scan)
    return scan


@api.post("/analyze/image", response_model=ScanResult)
async def analyze_image(req: ImageRequest, request: Request = None):
    try:
        b64 = _ensure_jpeg_b64(req.image_base64)
    except Exception as e:
        raise HTTPException(400, f"Invalid image: {e}")
    _require_ai()
    await check_and_consume(db, "image", req.session_id, request)
    pf = image_prefilter_b64(b64)
    if pf["short_circuit"]:
        norm = pf["short_circuit"]
        storage_path = await _store_image(req.session_id, b64)
        scan = ScanResult(
            session_id=req.session_id, type="image",
            preview=req.filename or "image.jpg",
            prefilter_flags=pf["flags"],
            storage_path=storage_path,
            **norm,
        )
        await _save_scan(scan)
        await _maybe_fire_webhook(scan)
        return scan
    try:
        parsed = await _llm_image(SYSTEM_IMAGE, "Analyze this image for AI/deepfake markers.", [b64])
    except Exception as e:
        raise _ai_http_error(e)
    norm = _normalize(parsed, allow_deepfake=True)
    storage_path = await _store_image(req.session_id, b64)
    scan = ScanResult(
        session_id=req.session_id, type="image",
        preview=req.filename or "image.jpg",
        prefilter_flags=pf["flags"],
        storage_path=storage_path,
        **norm,
    )
    await _save_scan(scan)
    await _maybe_fire_webhook(scan)
    return scan


@api.post("/analyze/video", response_model=ScanResult)
async def analyze_video(req: VideoRequest, request: Request = None):
    try:
        frames = _extract_video_frames(req.video_base64, n_frames=4)
        if not frames:
            raise ValueError("No frames extracted")
    except Exception as e:
        raise HTTPException(400, f"Invalid video: {e}")
    _require_ai()
    await check_and_consume(db, "video", req.session_id, request)
    try:
        parsed = await _llm_image(
            SYSTEM_VIDEO,
            f"Analyze these {len(frames)} sampled frames from a single video.",
            frames,
        )
    except Exception as e:
        raise _ai_http_error(e)
    norm = _normalize(parsed, allow_deepfake=True)
    storage_path = await _store_video(req.session_id, req.video_base64, req.filename)
    scan = ScanResult(
        session_id=req.session_id, type="video",
        preview=req.filename or "video.mp4",
        storage_path=storage_path,
        **norm,
    )
    await _save_scan(scan)
    await _maybe_fire_webhook(scan)
    return scan


@api.post("/analyze/url", response_model=ScanResult)
async def analyze_url(req: UrlRequest, request: Request = None):
    if not req.url.startswith(("http://", "https://")):
        raise HTTPException(400, "URL must include http(s)://")
    _require_ai()
    await check_and_consume(db, "url", req.session_id, request)
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True,
                                     headers={"User-Agent": "TruthLensBot/1.0"}) as cx:
            r = await cx.get(req.url)
        soup = BeautifulSoup(r.text, "html.parser")
        for s in soup(["script", "style", "noscript"]):
            s.decompose()
        title = (soup.title.string or "").strip() if soup.title else ""
        text = " ".join(soup.get_text(" ").split())[:8000]
    except Exception as e:
        raise HTTPException(400, f"Could not fetch URL: {e}")
    if len(text) < 100:
        raise HTTPException(400, "Page contained too little text to analyze")
    try:
        parsed = await _llm_text(
            SYSTEM_URL,
            f"URL: {req.url}\nTITLE: {title}\n\nBODY:\n{text}",
        )
    except Exception as e:
        raise _ai_http_error(e)
    norm = _normalize(parsed, allow_deepfake=False)
    if not norm.get("language") or norm["language"].upper() in ("N/A", "UNKNOWN"):
        norm["language"] = _detect_language(text) or norm.get("language")
    pf = text_prefilter(text)
    scan = ScanResult(
        session_id=req.session_id, type="url",
        preview=req.url,
        prefilter_flags=pf["flags"],
        **norm,
    )
    await _save_scan(scan)
    await _maybe_fire_webhook(scan)
    return scan


@api.get("/scans", response_model=List[ScanResult])
async def list_scans(session_id: Optional[str] = None, limit: int = 20):
    q: dict = {}
    if session_id:
        q["session_id"] = session_id
    cursor = db.scans.find(q, {"_id": 0}).sort("created_at", -1).limit(min(limit, 100))
    docs = await cursor.to_list(length=limit)
    return [_public_scan(d) for d in docs]


@api.get("/scans/{scan_id}", response_model=ScanResult)
async def get_scan(scan_id: str):
    doc = await db.scans.find_one({"id": scan_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Scan not found")
    return _public_scan(doc)


@api.get("/scans/{scan_id}/pdf")
async def scan_pdf(scan_id: str):
    doc = await db.scans.find_one({"id": scan_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Scan not found")
    pdf_bytes = _build_pdf(doc)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=truthlens-{scan_id[:8]}.pdf"},
    )


# ----- Comparison -----
class CompareItem(BaseModel):
    label: str
    type: Literal["text", "image", "url", "video"]
    content: Optional[str] = None
    image_base64: Optional[str] = None
    video_base64: Optional[str] = None
    url: Optional[str] = None


class CompareRequest(BaseModel):
    session_id: str
    items: List[CompareItem]  # exactly 2


class CompareResponse(BaseModel):
    items: List[ScanResult]
    winner: str  # label of the more-human-looking item, or "tie"
    delta: int  # absolute % difference in synthetic-score


@api.post("/analyze/compare", response_model=CompareResponse)
async def analyze_compare(req: CompareRequest):
    if len(req.items) != 2:
        raise HTTPException(400, "Comparison requires exactly two items")
    results: List[ScanResult] = []
    for item in req.items:
        if item.type == "text":
            if not item.content or len(item.content.strip()) < 20:
                raise HTTPException(400, f"'{item.label}': text must be at least 20 characters")
            sub = TextRequest(session_id=req.session_id, content=item.content)
            results.append(await analyze_text(sub))
        elif item.type == "image":
            if not item.image_base64:
                raise HTTPException(400, f"'{item.label}': image_base64 required")
            sub = ImageRequest(session_id=req.session_id, image_base64=item.image_base64, filename=item.label)
            results.append(await analyze_image(sub))
        elif item.type == "video":
            if not item.video_base64:
                raise HTTPException(400, f"'{item.label}': video_base64 required")
            sub = VideoRequest(session_id=req.session_id, video_base64=item.video_base64, filename=item.label)
            results.append(await analyze_video(sub))
        elif item.type == "url":
            if not item.url:
                raise HTTPException(400, f"'{item.label}': url required")
            sub = UrlRequest(session_id=req.session_id, url=item.url)
            results.append(await analyze_url(sub))
        else:
            raise HTTPException(400, f"Unsupported compare type: {item.type}")
    a, b = results
    delta = abs(a.score - b.score)
    if delta < 5:
        winner = "tie"
    else:
        winner = req.items[0].label if a.score < b.score else req.items[1].label
    return CompareResponse(items=results, winner=winner, delta=delta)


# ----- PDF builder -----
def _build_pdf(doc: dict) -> bytes:
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.units import inch
    from reportlab.pdfgen import canvas
    from reportlab.lib.colors import HexColor

    cls = (doc.get("classification") or "UNCERTAIN").upper()
    score = int(doc.get("score") or 0)
    cls_color = {
        "HUMAN": HexColor("#00BB55"),
        "AI": HexColor("#FFB800"),
        "DEEPFAKE": HexColor("#FF3B30"),
        "UNCERTAIN": HexColor("#A1A1AA"),
    }.get(cls, HexColor("#A1A1AA"))
    cyan = HexColor("#00E5FF")
    bg = HexColor("#0A0A0A")
    surface = HexColor("#121212")
    muted = HexColor("#A1A1AA")

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=LETTER)
    W, H = LETTER

    # Background
    c.setFillColor(bg)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # Header bar
    c.setFillColor(cyan)
    c.rect(0, H - 32, W, 32, fill=1, stroke=0)
    c.setFillColor(HexColor("#000000"))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(36, H - 22, "TRUTHLENS  ·  SCAN REPORT")
    c.setFont("Helvetica", 9)
    c.drawRightString(W - 36, H - 22, f"v1.0  ·  {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")

    # Title block
    y = H - 80
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 22)
    c.drawString(36, y, f"Scan #{(doc.get('id') or '')[:8].upper()}")
    y -= 22
    c.setFillColor(muted)
    c.setFont("Helvetica", 10)
    c.drawString(36, y, f"Type: {(doc.get('type') or '').upper()}    "
                       f"Created: {doc.get('created_at')}    "
                       f"Language: {doc.get('language') or 'N/A'}")
    y -= 28

    # Verdict block
    block_h = 130
    c.setFillColor(surface)
    c.rect(36, y - block_h, W - 72, block_h, fill=1, stroke=0)
    c.setStrokeColor(cls_color)
    c.setLineWidth(1.5)
    c.rect(36, y - block_h, W - 72, block_h, fill=0, stroke=1)

    # Big score
    c.setFillColor(cls_color)
    c.setFont("Helvetica-Bold", 64)
    c.drawString(56, y - 86, f"{score}")
    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(HexColor("#FFFFFF"))
    c.drawString(56 + (8.5 * len(str(score)) * 4.2), y - 86, "%")

    # Classification tag
    tag_x = 220
    c.setStrokeColor(cls_color)
    c.setFillColor(cls_color)
    c.setFont("Helvetica-Bold", 12)
    tag = f"  {cls}  "
    tw = c.stringWidth(tag, "Helvetica-Bold", 12)
    c.rect(tag_x, y - 36, tw, 18, fill=0, stroke=1)
    c.drawString(tag_x + 4, y - 32, cls)

    # Summary
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica", 11)
    summary = (doc.get("summary") or "")[:240]
    _draw_wrapped(c, summary, tag_x, y - 60, W - tag_x - 56, 13, "Helvetica", 11)

    # Confidence bar
    conf = int(doc.get("confidence") or 0)
    c.setFillColor(muted)
    c.setFont("Helvetica", 9)
    c.drawString(tag_x, y - 110, f"CONFIDENCE  {conf}%")
    c.setFillColor(HexColor("#1F1F1F"))
    c.rect(tag_x, y - 122, 220, 6, fill=1, stroke=0)
    c.setFillColor(cls_color)
    c.rect(tag_x, y - 122, 220 * conf / 100, 6, fill=1, stroke=0)

    y -= block_h + 26

    # Reasoning section
    c.setFillColor(cyan)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(36, y, "// REASONING")
    y -= 14
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica", 11)
    y = _draw_wrapped(c, doc.get("reasoning") or "", 36, y, W - 72, 14, "Helvetica", 11)
    y -= 16

    # Markers
    c.setFillColor(cyan)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(36, y, "// FORENSIC MARKERS")
    y -= 14
    for m in (doc.get("markers") or [])[:8]:
        sev = (m.get("severity") or "info").lower()
        sev_color = {"danger": HexColor("#FF3B30"), "warn": HexColor("#FFB800")}.get(sev, cyan)
        if y < 110:
            c.showPage()
            c.setFillColor(bg); c.rect(0, 0, W, H, fill=1, stroke=0)
            y = H - 60
        c.setFillColor(sev_color)
        c.rect(36, y - 4, 6, 6, fill=1, stroke=0)
        c.setFillColor(HexColor("#FFFFFF"))
        c.setFont("Helvetica-Bold", 10)
        c.drawString(48, y, (m.get("label") or "").upper()[:60])
        y -= 13
        c.setFillColor(muted)
        c.setFont("Helvetica", 10)
        y = _draw_wrapped(c, m.get("detail") or "", 48, y, W - 84, 13, "Helvetica", 10)
        y -= 8

    # Preview footer
    if y < 90:
        c.showPage(); c.setFillColor(bg); c.rect(0, 0, W, H, fill=1, stroke=0); y = H - 60
    c.setFillColor(cyan)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(36, y, "// PREVIEW")
    y -= 14
    c.setFillColor(muted)
    c.setFont("Helvetica", 9)
    _draw_wrapped(c, (doc.get("preview") or "")[:400], 36, y, W - 72, 12, "Helvetica", 9)

    # Footer
    c.setFillColor(muted)
    c.setFont("Helvetica", 8)
    c.drawString(36, 36, "Generated by TruthLens using Google Gemini (a general AI model, not a trained deepfake detector).")
    c.drawString(36, 24, "This is an AI-assisted estimate, not proof. Verify important content with other sources.")

    c.save()
    return buf.getvalue()


def _draw_wrapped(c, text: str, x: float, y: float, max_w: float, lh: float,
                  font: str = "Helvetica", size: int = 10) -> float:
    if not text:
        return y
    c.setFont(font, size)
    words = str(text).split()
    line = ""
    for w in words:
        test = (line + " " + w).strip()
        if c.stringWidth(test, font, size) <= max_w:
            line = test
        else:
            c.drawString(x, y, line)
            y -= lh
            line = w
            if y < 60:
                c.showPage()
                # restore black bg
                from reportlab.lib.colors import HexColor as _HC
                c.setFillColor(_HC("#0A0A0A"))
                W, H = c._pagesize
                c.rect(0, 0, W, H, fill=1, stroke=0)
                c.setFillColor(_HC("#FFFFFF"))
                c.setFont(font, size)
                y = H - 60
    if line:
        c.drawString(x, y, line)
        y -= lh
    return y


@api.get("/stats")
async def stats():
    total = await db.scans.count_documents({})
    deepfakes = await db.scans.count_documents({"classification": "DEEPFAKE"})
    ai_flagged = await db.scans.count_documents({"classification": "AI"})
    by_type = {}
    for t in ("text", "image", "video", "url"):
        by_type[t] = await db.scans.count_documents({"type": t})
    return {
        "total_scans": total,
        "deepfakes_detected": deepfakes,
        "ai_flagged": ai_flagged,
        "by_type": by_type,
    }


@api.get("/usage")
async def usage(session_id: str):
    """Return current usage and remaining quota for a given session."""
    return await usage_for(db, session_id)


# ---- Chrome Extension download ----
EXT_DIR = Path(__file__).resolve().parent.parent / "extension"


def _public_backend_url() -> str:
    # PUBLIC_BACKEND_URL (or REACT_APP_BACKEND_URL in frontend/.env) is the host the extension calls
    if os.environ.get("PUBLIC_BACKEND_URL"):
        return os.environ["PUBLIC_BACKEND_URL"].rstrip("/")
    if os.environ.get("RENDER_EXTERNAL_URL"):  # set automatically on Render
        return os.environ["RENDER_EXTERNAL_URL"].rstrip("/")
    env = Path(__file__).resolve().parent.parent / "frontend" / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL"):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


@api.get("/extension/download")
async def extension_download():
    if not EXT_DIR.exists():
        raise HTTPException(404, "Extension not built")
    backend_url = _public_backend_url()
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for p in EXT_DIR.rglob("*"):
            if not p.is_file():
                continue
            arc = str(p.relative_to(EXT_DIR))
            data = p.read_bytes()
            if arc.endswith(".js") and b"__BACKEND_URL__" in data:
                data = data.replace(b"__BACKEND_URL__", backend_url.encode())
            z.writestr(arc, data)
    buf.seek(0)
    return Response(
        content=buf.read(),
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=truthlens-extension.zip"},
    )


# ----- OG share-card image (public) -----
@api.get("/scans/{scan_id}/og.png")
async def scan_og(scan_id: str):
    doc = await db.scans.find_one({"id": scan_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Scan not found")
    png = render_og(doc)
    return Response(
        content=png,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=300"},
    )


# ----- File proxy (object storage download) -----
@api.get("/files/{path:path}")
async def file_proxy(path: str):
    # Security: only allow the truthlens app prefix
    if not path.startswith(f"{STORAGE_APP}/"):
        raise HTTPException(404, "Not found")
    res = await asyncio.to_thread(get_object, path)
    if not res:
        raise HTTPException(404, "Not found")
    data, ct = res
    return Response(content=data, media_type=ct,
                    headers={"Cache-Control": "public, max-age=600"})


# ----- Settings (per-session) -----
class WebhookSettings(BaseModel):
    session_id: str
    webhook_url: Optional[str] = None  # generic JSON webhook (Slack/Discord/Make/Zapier...)


@api.get("/settings/{session_id}")
async def get_settings(session_id: str):
    cfg = await db.settings.find_one({"session_id": session_id}, {"_id": 0}) or {}
    return {"session_id": session_id, "webhook_url": cfg.get("webhook_url")}


@api.post("/settings")
async def save_settings(req: WebhookSettings):
    if req.webhook_url and not req.webhook_url.startswith(("http://", "https://")):
        raise HTTPException(400, "webhook_url must start with http(s)://")
    await db.settings.update_one(
        {"session_id": req.session_id},
        {"$set": {
            "session_id": req.session_id,
            "webhook_url": req.webhook_url,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"ok": True}


@api.post("/settings/{session_id}/test-webhook")
async def test_webhook(session_id: str):
    cfg = await db.settings.find_one({"session_id": session_id}, {"_id": 0})
    url = (cfg or {}).get("webhook_url")
    if not url:
        raise HTTPException(400, "No webhook configured")
    payload = {
        "service": "TruthLens",
        "event": "test",
        "text": "✅ TruthLens webhook test fired successfully.",
    }
    try:
        async with httpx.AsyncClient(timeout=8) as cx:
            r = await cx.post(url, json=payload)
        return {"ok": True, "status": r.status_code}
    except Exception as e:
        raise HTTPException(502, f"Webhook test failed: {e}")


# ----- Bulk multi-file scan -----
class BulkItem(BaseModel):
    kind: Literal["image", "text", "url"]
    image_base64: Optional[str] = None
    content: Optional[str] = None
    url: Optional[str] = None
    filename: Optional[str] = None


class BulkRequest(BaseModel):
    session_id: str
    items: List[BulkItem]


@api.post("/analyze/bulk")
async def analyze_bulk(req: BulkRequest):
    if not req.items:
        raise HTTPException(400, "No items")
    if len(req.items) > 12:
        raise HTTPException(400, "Maximum 12 items per bulk request")

    async def run(item: BulkItem) -> dict:
        try:
            if item.kind == "text":
                r = await analyze_text(TextRequest(session_id=req.session_id, content=item.content or ""))
            elif item.kind == "image":
                r = await analyze_image(ImageRequest(session_id=req.session_id,
                                                    image_base64=item.image_base64 or "",
                                                    filename=item.filename))
            elif item.kind == "url":
                r = await analyze_url(UrlRequest(session_id=req.session_id, url=item.url or ""))
            else:
                return {"ok": False, "error": "unsupported kind"}
            return {"ok": True, "scan": r.model_dump(mode="json")}
        except HTTPException as e:
            return {"ok": False, "error": e.detail, "filename": item.filename}
        except Exception as e:
            return {"ok": False, "error": str(e), "filename": item.filename}

    results = await asyncio.gather(*[run(it) for it in req.items])
    summary = {
        "total": len(results),
        "ok": sum(1 for r in results if r["ok"]),
        "deepfakes": sum(1 for r in results if r["ok"] and r["scan"]["classification"] == "DEEPFAKE"),
        "ai": sum(1 for r in results if r["ok"] and r["scan"]["classification"] == "AI"),
    }
    return {"results": results, "summary": summary}


# ----- Auth (magic-link) — stub: coming soon -----
@api.post("/auth/request-link")
async def auth_request_link():
    raise HTTPException(503, "Email magic-link login is coming soon. Set RESEND_API_KEY to enable.")


@api.get("/auth/me")
async def auth_me():
    return {"authenticated": False, "reason": "magic-link login not yet enabled"}


# Mount router
app.include_router(api)



@app.middleware("http")
async def _catch_unhandled(request: Request, call_next):
    # Return unexpected errors as JSON *inside* the CORS layer, so the browser
    # sees a readable message instead of a blocked/opaque 500.
    try:
        return await call_next(request)
    except Exception:
        log.exception("unhandled error on %s", request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Something went wrong on the server. Please try again."})


# CORS: explicit origins from CORS_ORIGINS (comma list, "*" = any) plus any
# TruthLens deployment on Vercel (Vercel may add a suffix, e.g. truthlens-abc.vercel.app).
_cors_origins = [o.strip().rstrip("/") for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
_cors_regex = os.environ.get(
    "CORS_ORIGIN_REGEX",
    r"https://truthlens[-a-z0-9]*\.vercel\.app|http://localhost(:\d+)?|http://127\.0\.0\.1(:\d+)?",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=_cors_regex,
    # No cookies are used (the browser keeps an anonymous session id in
    # localStorage), so credentials stay off; that also makes "*" valid.
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    # Initialise object storage session in a non-blocking way
    try:
        await asyncio.to_thread(init_storage)
    except Exception as e:
        log.warning(f"storage init failed at startup: {e}")
    # Rate-limit indexes
    try:
        await ensure_rl_indexes(db)
    except Exception as e:
        log.warning(f"rate-limit index setup failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
