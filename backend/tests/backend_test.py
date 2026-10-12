"""TruthLens backend regression tests."""
import os
import io
import base64
import uuid
import zipfile
import time
import pytest
import requests
from PIL import Image, ImageDraw

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Read from frontend .env
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", ".env")
    if os.path.exists(env_path):
        for line in open(env_path).read().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').strip("'")
                break
BASE_URL = (BASE_URL or "").rstrip("/")
API = f"{BASE_URL}/api"

SESSION_ID = f"TEST_{uuid.uuid4().hex[:8]}"


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ------------------ root + stats ------------------
class TestBasic:
    def test_root(self, client):
        r = client.get(f"{API}/", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data.get("app") == "TruthLens"
        assert data.get("status") == "online"
        assert "version" in data

    def test_stats_shape(self, client):
        r = client.get(f"{API}/stats", timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_scans", "deepfakes_detected", "ai_flagged", "by_type"):
            assert k in d
        assert isinstance(d["by_type"], dict)
        for t in ("text", "image", "video", "url"):
            assert t in d["by_type"]


# ------------------ text ------------------
class TestText:
    def test_text_too_short(self, client):
        r = client.post(f"{API}/analyze/text",
                        json={"session_id": SESSION_ID, "content": "tiny"}, timeout=20)
        assert r.status_code == 400

    def test_text_valid(self, client):
        content = ("Artificial intelligence has rapidly transformed numerous industries "
                   "by automating complex tasks, augmenting human decision-making, and "
                   "enabling new forms of creativity in art, science, and engineering.")
        r = client.post(f"{API}/analyze/text",
                        json={"session_id": SESSION_ID, "content": content}, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["type"] == "text"
        assert 0 <= d["score"] <= 100
        assert d["classification"] in {"HUMAN", "AI", "UNCERTAIN"}
        assert isinstance(d["reasoning"], str) and len(d["reasoning"]) > 0
        assert isinstance(d["markers"], list)
        assert "id" in d
        # persistence check
        gid = d["id"]
        r2 = client.get(f"{API}/scans/{gid}", timeout=20)
        assert r2.status_code == 200
        assert r2.json()["id"] == gid


# ------------------ url ------------------
class TestUrl:
    def test_bad_url(self, client):
        r = client.post(f"{API}/analyze/url",
                        json={"session_id": SESSION_ID, "url": "not-a-url"}, timeout=20)
        assert r.status_code == 400

    def test_real_url(self, client):
        r = client.post(f"{API}/analyze/url",
                        json={"session_id": SESSION_ID, "url": "https://example.com"}, timeout=120)
        # example.com has minimal text — backend may reject with 400 ("too little text")
        if r.status_code == 400:
            pytest.skip(f"example.com too short: {r.text}")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["type"] == "url"
        assert d["classification"] in {"HUMAN", "AI", "UNCERTAIN"}

    def test_real_url_wikipedia(self, client):
        r = client.post(f"{API}/analyze/url",
                        json={"session_id": SESSION_ID,
                              "url": "https://en.wikipedia.org/wiki/Deepfake"}, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["type"] == "url"
        assert d["preview"].startswith("https://")


# ------------------ image ------------------
def _make_real_jpeg_b64():
    """Build a small JPEG with shapes/text so it has features."""
    img = Image.new("RGB", (256, 256), (200, 220, 255))
    d = ImageDraw.Draw(img)
    d.rectangle((20, 20, 120, 120), fill=(255, 80, 60), outline=(0, 0, 0), width=3)
    d.ellipse((140, 30, 230, 120), fill=(60, 200, 100), outline=(0, 0, 0), width=3)
    d.line((10, 240, 250, 200), fill=(20, 30, 80), width=4)
    d.text((30, 200), "TruthLens", fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


class TestImage:
    def test_invalid_image(self, client):
        r = client.post(f"{API}/analyze/image",
                        json={"session_id": SESSION_ID,
                              "image_base64": base64.b64encode(b"not an image").decode()},
                        timeout=30)
        assert r.status_code == 400

    def test_valid_image(self, client):
        b64 = _make_real_jpeg_b64()
        r = client.post(f"{API}/analyze/image",
                        json={"session_id": SESSION_ID,
                              "image_base64": b64,
                              "filename": "TEST_truthlens.jpg"},
                        timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["type"] == "image"
        assert d["classification"] in {"HUMAN", "AI", "DEEPFAKE", "UNCERTAIN"}
        assert 0 <= d["score"] <= 100
        assert isinstance(d["markers"], list)


# ------------------ scans listing ------------------
class TestScans:
    def test_list_by_session(self, client):
        # Should have entries created in earlier tests
        r = client.get(f"{API}/scans", params={"session_id": SESSION_ID, "limit": 50}, timeout=20)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        # all returned items must be from this session
        for it in items:
            assert it["session_id"] == SESSION_ID

    def test_get_unknown_scan_404(self, client):
        r = client.get(f"{API}/scans/{uuid.uuid4()}", timeout=20)
        assert r.status_code == 404


# ------------------ extension ------------------
class TestExtension:
    def test_download_zip(self, client):
        r = client.get(f"{API}/extension/download", timeout=30)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/zip")
        body = r.content
        assert len(body) > 500
        z = zipfile.ZipFile(io.BytesIO(body))
        names = z.namelist()
        for needed in ("manifest.json", "popup.html", "popup.js",
                       "background.js", "content.js"):
            assert needed in names, f"missing {needed} in zip ({names})"
        # __BACKEND_URL__ should be replaced in every JS file in the zip
        for n in names:
            if n.endswith(".js"):
                data = z.read(n).decode("utf-8", "ignore")
                assert "__BACKEND_URL__" not in data, f"placeholder not replaced in {n}"
        # backend URL should be present in background.js (the file that uses it)
        bg = z.read("background.js").decode("utf-8", "ignore")
        if BASE_URL:
            assert BASE_URL in bg, "backend URL not injected into background.js"


# ------------------ P2: Compare ------------------
HUMAN_TEXT = (
    "I went down to the river yesterday with my brother because it had been ages since "
    "we'd just messed around with fishing rods. Half the worms got away, the dog stole a "
    "sandwich, and the only thing we caught was a bad sunburn. Best afternoon in months."
)
AI_TEXT = (
    "In the modern era, artificial intelligence systems have demonstrated significant "
    "capabilities across diverse domains. By leveraging advanced machine learning "
    "algorithms, these systems can effectively analyze, interpret, and generate complex "
    "data patterns, thereby augmenting decision-making processes in numerous industries. "
    "Furthermore, ongoing research continues to enhance their robustness and reliability."
)


class TestCompare:
    def test_compare_text_pair(self, client):
        payload = {
            "session_id": SESSION_ID,
            "items": [
                {"label": "A", "type": "text", "content": AI_TEXT},
                {"label": "B", "type": "text", "content": HUMAN_TEXT},
            ],
        }
        r = client.post(f"{API}/analyze/compare", json=payload, timeout=240)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "items" in d and len(d["items"]) == 2
        assert d["winner"] in ("A", "B", "tie")
        assert isinstance(d["delta"], int)
        # both items have language field
        for it in d["items"]:
            assert "language" in it
            assert it["type"] == "text"

    def test_compare_url_pair(self, client):
        payload = {
            "session_id": SESSION_ID,
            "items": [
                {"label": "A", "type": "url", "url": "https://example.com"},
                {"label": "B", "type": "url", "url": "https://en.wikipedia.org/wiki/Deepfake"},
            ],
        }
        r = client.post(f"{API}/analyze/compare", json=payload, timeout=240)
        # example.com may be too short -> 400
        if r.status_code == 400:
            pytest.skip(f"example.com rejected: {r.text}")
        assert r.status_code == 200, r.text
        d = r.json()
        assert len(d["items"]) == 2
        assert d["winner"] in ("A", "B", "tie")

    def test_compare_wrong_count(self, client):
        r = client.post(f"{API}/analyze/compare",
                        json={"session_id": SESSION_ID,
                              "items": [{"label": "A", "type": "text", "content": AI_TEXT}]},
                        timeout=20)
        assert r.status_code == 400

    def test_compare_short_text_400(self, client):
        r = client.post(f"{API}/analyze/compare",
                        json={"session_id": SESSION_ID,
                              "items": [
                                  {"label": "Alpha", "type": "text", "content": "tiny"},
                                  {"label": "Beta", "type": "text", "content": HUMAN_TEXT},
                              ]},
                        timeout=20)
        assert r.status_code == 400
        # error message should mention the offending label
        assert "Alpha" in r.text


# ------------------ P2: PDF export ------------------
class TestPdf:
    def test_pdf_for_existing_scan(self, client):
        # Create a text scan first
        content = ("This is a sample paragraph used to test PDF export of TruthLens scan "
                   "results. It contains enough text for the analyzer to produce reasoning.")
        r = client.post(f"{API}/analyze/text",
                        json={"session_id": SESSION_ID, "content": content}, timeout=120)
        assert r.status_code == 200, r.text
        sid = r.json()["id"]
        r2 = client.get(f"{API}/scans/{sid}/pdf", timeout=30)
        assert r2.status_code == 200, r2.text
        assert r2.headers.get("content-type", "").startswith("application/pdf")
        body = r2.content
        assert len(body) > 500
        assert body[:5] == b"%PDF-"

    def test_pdf_404(self, client):
        r = client.get(f"{API}/scans/{uuid.uuid4()}/pdf", timeout=20)
        assert r.status_code == 404


# ------------------ P2: Multi-language ------------------
class TestLanguage:
    def test_spanish_detection(self, client):
        spanish = (
            "La inteligencia artificial ha transformado rapidamente numerosas industrias "
            "automatizando tareas complejas y permitiendo nuevas formas de creatividad en "
            "el arte, la ciencia y la ingenieria moderna del siglo veintiuno."
        )
        r = client.post(f"{API}/analyze/text",
                        json={"session_id": SESSION_ID, "content": spanish}, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("language"), "language field missing for Spanish text"
        assert "spanish" in d["language"].lower() or "espan" in d["language"].lower()

    def test_french_detection(self, client):
        french = (
            "L'intelligence artificielle transforme rapidement de nombreuses industries en "
            "automatisant des taches complexes et en permettant de nouvelles formes de "
            "creativite dans l'art, la science et l'ingenierie contemporaine."
        )
        r = client.post(f"{API}/analyze/text",
                        json={"session_id": SESSION_ID, "content": french}, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("language"), "language field missing for French text"
        assert "french" in d["language"].lower() or "fran" in d["language"].lower()

    def test_english_has_language(self, client):
        content = ("The quick brown fox jumps over the lazy dog repeatedly while the "
                   "afternoon sun casts long shadows across the quiet meadow.")
        r = client.post(f"{API}/analyze/text",
                        json={"session_id": SESSION_ID, "content": content}, timeout=120)
        assert r.status_code == 200, r.text
        assert r.json().get("language"), "language field missing for English text"


# ------------------ P3: Object storage + file proxy ------------------
def _make_uniform_red_png_b64():
    img = Image.new("RGB", (32, 32), (255, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


class TestStorageAndFiles:
    def test_image_returns_storage_path(self, client):
        b64 = _make_real_jpeg_b64()
        r = client.post(f"{API}/analyze/image",
                        json={"session_id": SESSION_ID, "image_base64": b64,
                              "filename": "TEST_storage.jpg"}, timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        sp = d.get("storage_path")
        assert sp, f"storage_path missing: {d}"
        assert sp.startswith("truthlens/sessions/"), sp
        # save for next test
        TestStorageAndFiles.STORAGE_PATH = sp

    def test_file_proxy_returns_image(self, client):
        sp = getattr(TestStorageAndFiles, "STORAGE_PATH", None)
        if not sp:
            pytest.skip("no storage_path from previous test")
        r = client.get(f"{API}/files/{sp}", timeout=30)
        assert r.status_code == 200, r.text
        ct = r.headers.get("content-type", "")
        assert "image/jpeg" in ct, ct
        assert len(r.content) > 200

    def test_file_proxy_unprefixed_404(self, client):
        r = client.get(f"{API}/files/foo", timeout=20)
        assert r.status_code == 404

    def test_file_proxy_unknown_404(self, client):
        r = client.get(f"{API}/files/truthlens/sessions/none/{uuid.uuid4()}.jpg", timeout=20)
        assert r.status_code == 404


# ------------------ P3: OG image ------------------
class TestOGImage:
    def test_og_for_existing(self, client):
        # create a quick text scan
        content = ("This is sample text for OG image rendering testing of TruthLens. "
                   "It needs to be at least twenty characters long for the analyzer.")
        r = client.post(f"{API}/analyze/text",
                        json={"session_id": SESSION_ID, "content": content}, timeout=120)
        assert r.status_code == 200, r.text
        sid = r.json()["id"]
        r2 = client.get(f"{API}/scans/{sid}/og.png", timeout=30)
        assert r2.status_code == 200, r2.text
        assert r2.headers.get("content-type", "").startswith("image/png")
        body = r2.content
        # PNG magic
        assert body[:8] == b"\x89PNG\r\n\x1a\n", "missing PNG header"
        assert len(body) > 10_000, f"OG image too small: {len(body)}"

    def test_og_404(self, client):
        r = client.get(f"{API}/scans/{uuid.uuid4()}/og.png", timeout=20)
        assert r.status_code == 404


# ------------------ P3: Pre-filter ------------------
class TestPrefilter:
    def test_text_ai_tell_flag(self, client):
        content = ("As an AI language model, I cannot provide personal opinions, but I can "
                   "certainly outline the key considerations relevant to this topic.")
        r = client.post(f"{API}/analyze/text",
                        json={"session_id": SESSION_ID, "content": content}, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        flags = d.get("prefilter_flags") or []
        assert any("ai" in f.lower() or "tell" in f.lower() or "language model" in f.lower()
                   for f in flags) or len(flags) > 0, f"expected prefilter flags, got {flags}"

    def test_image_uniform_short_circuit(self, client):
        b64 = _make_uniform_red_png_b64()
        t0 = time.time()
        r = client.post(f"{API}/analyze/image",
                        json={"session_id": SESSION_ID, "image_base64": b64,
                              "filename": "TEST_uniform.png"}, timeout=60)
        elapsed = time.time() - t0
        assert r.status_code == 200, r.text
        d = r.json()
        # Should be UNCERTAIN and short-circuited
        assert d["classification"] == "UNCERTAIN", d
        flags = d.get("prefilter_flags") or []
        assert any("uniform" in f.lower() for f in flags), f"expected 'image:uniform-color' flag, got {flags}"
        # Should be fast (no LLM call)
        assert elapsed < 15, f"prefilter short-circuit too slow ({elapsed:.1f}s) — LLM may have been called"
        # reasoning should mention uniform/blank
        rr = (d.get("reasoning") or "").lower()
        assert "uniform" in rr or "blank" in rr or "solid" in rr, d.get("reasoning")


# ------------------ P3: Bulk ------------------
class TestBulk:
    def test_bulk_mixed(self, client):
        payload = {
            "session_id": SESSION_ID,
            "items": [
                {"kind": "text", "content": HUMAN_TEXT},
                {"kind": "url", "url": "https://en.wikipedia.org/wiki/Deepfake"},
            ],
        }
        r = client.post(f"{API}/analyze/bulk", json=payload, timeout=240)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "results" in d and "summary" in d
        assert len(d["results"]) == 2
        s = d["summary"]
        for k in ("total", "ok", "deepfakes", "ai"):
            assert k in s
        assert s["total"] == 2
        # at least one ok with full scan
        ok_results = [r for r in d["results"] if r.get("ok")]
        assert ok_results, d
        scan = ok_results[0]["scan"]
        for k in ("id", "type", "score", "classification", "confidence"):
            assert k in scan

    def test_bulk_too_many(self, client):
        items = [{"kind": "text", "content": HUMAN_TEXT} for _ in range(13)]
        r = client.post(f"{API}/analyze/bulk",
                        json={"session_id": SESSION_ID, "items": items}, timeout=20)
        assert r.status_code == 400


# ------------------ P3: Settings + Webhooks ------------------
class TestSettings:
    def test_settings_roundtrip(self, client):
        sid = f"TEST_set_{uuid.uuid4().hex[:8]}"
        url = "https://httpbin.org/post"
        r = client.post(f"{API}/settings",
                        json={"session_id": sid, "webhook_url": url}, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True
        r2 = client.get(f"{API}/settings/{sid}", timeout=20)
        assert r2.status_code == 200
        assert r2.json().get("webhook_url") == url

    def test_settings_invalid_url(self, client):
        sid = f"TEST_set_{uuid.uuid4().hex[:8]}"
        r = client.post(f"{API}/settings",
                        json={"session_id": sid, "webhook_url": "not-a-url"}, timeout=20)
        assert r.status_code == 400

    def test_test_webhook_no_config(self, client):
        sid = f"TEST_nowh_{uuid.uuid4().hex[:8]}"
        r = client.post(f"{API}/settings/{sid}/test-webhook", timeout=20)
        assert r.status_code == 400

    def test_test_webhook_fires(self, client):
        sid = f"TEST_wh_{uuid.uuid4().hex[:8]}"
        client.post(f"{API}/settings",
                    json={"session_id": sid, "webhook_url": "https://httpbin.org/post"}, timeout=20)
        r = client.post(f"{API}/settings/{sid}/test-webhook", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("ok") is True
        assert d.get("status") == 200


# ------------------ P3: Auth stubs ------------------
class TestAuthStub:
    def test_request_link_503(self, client):
        r = client.post(f"{API}/auth/request-link", json={}, timeout=20)
        assert r.status_code == 503

    def test_auth_me_unauthenticated(self, client):
        r = client.get(f"{API}/auth/me", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d.get("authenticated") is False


# ------------------ P2: Extension icons ------------------
class TestExtensionIcons:
    def test_zip_contains_polished_icons(self, client):
        r = client.get(f"{API}/extension/download", timeout=30)
        assert r.status_code == 200
        z = zipfile.ZipFile(io.BytesIO(r.content))
        names = z.namelist()
        for needed in ("icons/icon16.png", "icons/icon32.png",
                       "icons/icon48.png", "icons/icon128.png"):
            assert needed in names, f"missing {needed}"
        # manifest references icon32
        manifest = z.read("manifest.json").decode("utf-8")
        assert "icon32.png" in manifest

