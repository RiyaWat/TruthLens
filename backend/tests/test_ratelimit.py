"""Iteration 4 tests — rate-limiting + /api/usage endpoint.

Strategy:
- Use a UNIQUE session_id per test class to avoid collateral counter writes
  across tests (and to avoid the live LLM budget).
- Seed the MongoDB ratelimit bucket directly to drive the 429 path cheaply.
- Run only a handful of real /analyze/text calls (each is one cheap LLM hit).
"""
import os
import time
import uuid
from datetime import datetime, timezone

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"

# direct mongo for bucket-seeding
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
_mongo = MongoClient(MONGO_URL)
_db = _mongo[DB_NAME]


def _new_session() -> str:
    return f"TEST_rl_{uuid.uuid4()}"


def _hour_epoch() -> int:
    now = int(time.time())
    return now - (now % 3600)


def _seed_session_hour(session_id: str, count: int):
    """Seed the per-session HOUR bucket directly (matches ratelimit._bucket)."""
    bucket = f"sess:{session_id}:hour:{_hour_epoch()}"
    _db.ratelimit.update_one(
        {"bucket": bucket},
        {"$set": {"bucket": bucket, "count": count, "createdAt": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return bucket


# ---------- /api/usage schema ----------
class TestUsageEndpoint:
    def test_usage_new_session_baseline(self):
        sid = _new_session()
        r = requests.get(f"{API}/usage", params={"session_id": sid}, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        # all four kinds present
        for kind, exp_h, exp_d in [("text", 30, 100), ("url", 30, 100),
                                   ("image", 10, 30), ("video", 5, 15)]:
            assert kind in data, f"missing kind={kind}"
            u = data[kind]
            assert u["hour_used"] == 0
            assert u["day_used"] == 0
            assert u["hour_limit"] == exp_h
            assert u["day_limit"] == exp_d
            assert u["hour_remaining"] == exp_h
            assert u["day_remaining"] == exp_d
            assert "hour_reset_in" in u and isinstance(u["hour_reset_in"], int)
            assert "day_reset_in" in u and isinstance(u["day_reset_in"], int)
            assert 0 < u["hour_reset_in"] <= 3600
            assert 0 < u["day_reset_in"] <= 86400
        assert data["_disabled"] is False


# ---------- analyze endpoints increment counters ----------
class TestCountersIncrement:
    def test_text_increments(self):
        sid = _new_session()
        body = {"session_id": sid, "content": "lorem ipsum dolor sit amet consectetur adipiscing"}
        r = requests.post(f"{API}/analyze/text", json=body, timeout=120)
        assert r.status_code == 200, r.text
        u = requests.get(f"{API}/usage", params={"session_id": sid}, timeout=20).json()
        assert u["text"]["hour_used"] >= 1
        assert u["text"]["day_used"] >= 1
        assert u["text"]["hour_remaining"] == u["text"]["hour_limit"] - u["text"]["hour_used"]

    def test_url_increments(self):
        sid = _new_session()
        body = {"session_id": sid, "url": "https://example.com"}
        r = requests.post(f"{API}/analyze/url", json=body, timeout=60)
        # Note: example.com may have <100 chars text -> 400; we only need the
        # rate-limit consume to fire BEFORE that check. So use httpbin.
        if r.status_code == 400:
            body["url"] = "https://en.wikipedia.org/wiki/Special:Random"
            r = requests.post(f"{API}/analyze/url", json=body, timeout=120)
        assert r.status_code in (200, 400, 502), r.text  # consume happens before fetch errors? check
        u = requests.get(f"{API}/usage", params={"session_id": sid}, timeout=20).json()
        # url consume happens BEFORE the URL fetch (see server.py line 510 — actually after .startswith check)
        assert u["url"]["hour_used"] >= 1, f"url hour_used should be >=1, got {u['url']}"

    def test_image_increments(self):
        sid = _new_session()
        # 1x1 white JPEG (smallest valid). Image prefilter short-circuits on
        # uniform-color, so this is cheap (no LLM hit).
        # Smallest valid JPEG bytes (taken from iter-3 test): use a generated tiny image.
        import io as _io
        from PIL import Image
        im = Image.new("RGB", (16, 16), (200, 200, 200))
        buf = _io.BytesIO()
        im.save(buf, format="JPEG")
        import base64 as _b64
        b64 = _b64.b64encode(buf.getvalue()).decode()
        body = {"session_id": sid, "image_base64": b64, "filename": "TEST_rl.jpg"}
        r = requests.post(f"{API}/analyze/image", json=body, timeout=60)
        assert r.status_code == 200, r.text
        u = requests.get(f"{API}/usage", params={"session_id": sid}, timeout=20).json()
        assert u["image"]["hour_used"] >= 1

    def test_compare_two_text_items_increments_text_by_2(self):
        sid = _new_session()
        items = [
            {"label": "A", "type": "text",
             "content": "lorem ipsum dolor sit amet consectetur"},
            {"label": "B", "type": "text",
             "content": "the quick brown fox jumps over the lazy dog repeatedly"},
        ]
        r = requests.post(f"{API}/analyze/compare",
                          json={"session_id": sid, "items": items}, timeout=180)
        assert r.status_code == 200, r.text
        u = requests.get(f"{API}/usage", params={"session_id": sid}, timeout=20).json()
        assert u["text"]["hour_used"] >= 2, f"expected >=2, got {u['text']}"

    def test_bulk_mix_increments_respective_counters(self):
        sid = _new_session()
        # bulk uses `kind`, not `type`
        items = [
            {"kind": "text",
             "content": "lorem ipsum dolor sit amet consectetur adipiscing"},
            {"kind": "url",
             "url": "https://en.wikipedia.org/wiki/Special:Random"},
        ]
        r = requests.post(f"{API}/analyze/bulk",
                          json={"session_id": sid, "items": items}, timeout=180)
        assert r.status_code == 200, r.text
        u = requests.get(f"{API}/usage", params={"session_id": sid}, timeout=20).json()
        assert u["text"]["hour_used"] >= 1, u["text"]
        assert u["url"]["hour_used"] >= 1, u["url"]


# ---------- 429 path via bucket-seeding ----------
class TestRateLimit429:
    def test_seeded_bucket_returns_429_with_friendly_detail(self):
        sid = _new_session()
        # Seed past the text hourly cap (30)
        bucket = _seed_session_hour(sid, 99)
        body = {"session_id": sid, "content": "lorem ipsum dolor sit amet consectetur adipiscing"}
        r = requests.post(f"{API}/analyze/text", json=body, timeout=30)
        assert r.status_code == 429, f"expected 429, got {r.status_code}: {r.text}"
        data = r.json()
        # FastAPI HTTPException(detail=...) returns {"detail": <obj>}
        detail = data.get("detail")
        assert isinstance(detail, dict), f"expected dict detail, got {detail!r}"
        assert detail.get("error") == "rate_limited"
        assert detail.get("scope") == "session"
        assert detail.get("window") == "hour"
        assert detail.get("limit") == 30
        assert detail.get("used", 0) > 30
        assert "retry_after_sec" in detail
        msg = detail.get("message", "")
        assert "Hourly limit reached for text" in msg
        assert "30/h" in msg
        # cleanup
        _db.ratelimit.delete_one({"bucket": bucket})

    def test_usage_after_429_shows_zero_remaining(self):
        sid = _new_session()
        bucket = _seed_session_hour(sid, 35)  # over text(30) + image(10) limits
        # trigger one rate-limited call so the counter increments to 36
        r = requests.post(f"{API}/analyze/text",
                          json={"session_id": sid,
                                "content": "lorem ipsum dolor sit amet consectetur adipiscing"},
                          timeout=30)
        assert r.status_code == 429
        u = requests.get(f"{API}/usage", params={"session_id": sid}, timeout=20).json()
        # text: cap 30, used >=35 -> remaining 0
        assert u["text"]["hour_used"] >= u["text"]["hour_limit"]
        assert u["text"]["hour_remaining"] == 0
        _db.ratelimit.delete_one({"bucket": bucket})


# ---------- regression: a single working /analyze/text flow ----------
class TestRegression:
    def test_analyze_text_basic_flow(self):
        sid = _new_session()
        r = requests.post(f"{API}/analyze/text",
                          json={"session_id": sid,
                                "content": "lorem ipsum dolor sit amet consectetur adipiscing"},
                          timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("type") == "text"
        assert "score" in data and isinstance(data["score"], int)
        assert "classification" in data
        assert data.get("session_id") == sid


# ---------- cleanup TEST_ session ratelimit rows ----------
@pytest.fixture(scope="session", autouse=True)
def _cleanup_test_buckets():
    yield
    try:
        _db.ratelimit.delete_many({"bucket": {"$regex": "^sess:TEST_rl_"}})
        _db.scans.delete_many({"session_id": {"$regex": "^TEST_rl_"}})
    except Exception:
        pass
