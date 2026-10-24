"""Rate limiting for TruthLens analyze endpoints.

- Per-session limits (hourly + daily) keyed by `session_id`
- Per-IP backstop (hourly) keyed by client IP — catches session-id rotation
- Stored in MongoDB collection `ratelimit` with a TTL index so old buckets
  auto-clean.

Limits are tuned to the cost profile of each content type:
- text / url : cheap (LLM tokens only) -> high cap
- image      : Gemini Pro vision -> mid cap
- video      : Gemini Pro vision x4 frames -> low cap
"""
from __future__ import annotations
import os
import time
from datetime import datetime, timezone, timedelta
from typing import Tuple, Dict
from fastapi import HTTPException, Request


# limits (env-overridable)
def _int_env(k: str, default: int) -> int:
    try:
        return int(os.environ.get(k, default))
    except Exception:
        return default


LIMITS: Dict[str, Dict[str, int]] = {
    # cost-tier      hour  day
    "text":  {"hour": _int_env("RL_TEXT_HOUR", 30),  "day": _int_env("RL_TEXT_DAY", 100)},
    "url":   {"hour": _int_env("RL_URL_HOUR", 30),   "day": _int_env("RL_URL_DAY", 100)},
    "image": {"hour": _int_env("RL_IMAGE_HOUR", 10), "day": _int_env("RL_IMAGE_DAY", 30)},
    "video": {"hour": _int_env("RL_VIDEO_HOUR", 5),  "day": _int_env("RL_VIDEO_DAY", 15)},
}
# IP backstop — combined across types
IP_HOUR_LIMIT = _int_env("RL_IP_HOUR", 200)
# 0 disables rate-limiting entirely (useful in tests).
RL_DISABLED = os.environ.get("RL_DISABLED", "0") in ("1", "true", "yes")


# bucket helpers
def _bucket(scope: str, key: str, window: str, kind: str | None = None) -> str:
    """Compose a bucket id, e.g. sess:abc:text:hour:1738742400.

    The optional `kind` is used so that per-content-type session quotas are
    independent (a text scan must not consume image quota). The IP backstop
    bucket intentionally omits kind so it spans all types.
    """
    now = int(time.time())
    if window == "hour":
        ts = now - (now % 3600)
    else:  # day
        ts = now - (now % 86400)
    parts = [scope, key]
    if kind:
        parts.append(kind)
    parts.extend([window, str(ts)])
    return ":".join(parts)


async def ensure_indexes(db) -> None:
    # createdAt with TTL of 26h auto-purges spent buckets.
    try:
        await db.ratelimit.create_index("createdAt", expireAfterSeconds=26 * 3600)
        await db.ratelimit.create_index("bucket", unique=True)
    except Exception:
        pass


def _client_ip(request: Request) -> str:
    if not request:
        return "unknown"
    fwd = request.headers.get("x-forwarded-for") or request.headers.get("X-Forwarded-For")
    if fwd:
        return fwd.split(",")[0].strip()
    return (request.client.host if request.client else "unknown") or "unknown"


async def _incr(db, bucket: str) -> int:
    doc = await db.ratelimit.find_one_and_update(
        {"bucket": bucket},
        {"$inc": {"count": 1},
         "$setOnInsert": {"bucket": bucket, "createdAt": datetime.now(timezone.utc)}},
        upsert=True,
        return_document=True,
    )
    return int((doc or {}).get("count", 1))


async def _peek(db, bucket: str) -> int:
    doc = await db.ratelimit.find_one({"bucket": bucket}, {"_id": 0, "count": 1})
    return int((doc or {}).get("count", 0))


def _seconds_until_next(window: str) -> int:
    now = int(time.time())
    return (3600 - (now % 3600)) if window == "hour" else (86400 - (now % 86400))


# public API
async def check_and_consume(db, kind: str, session_id: str, request: Request | None = None,
                            cost: int = 1) -> Dict[str, int]:
    """Increment counters and raise 429 if any cap is exceeded.
    Returns the post-increment usage dict."""
    if RL_DISABLED:
        return {}
    if kind not in LIMITS:
        return {}
    h_lim = LIMITS[kind]["hour"]
    d_lim = LIMITS[kind]["day"]

    sess_hour = _bucket("sess", session_id, "hour", kind)
    sess_day = _bucket("sess", session_id, "day", kind)

    h_count = await _incr(db, sess_hour)
    d_count = await _incr(db, sess_day)

    if h_count > h_lim:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "rate_limited",
                "scope": "session",
                "window": "hour",
                "limit": h_lim,
                "used": h_count,
                "retry_after_sec": _seconds_until_next("hour"),
                "message": f"Hourly limit reached for {kind} ({h_lim}/h). Try again in "
                           f"{_seconds_until_next('hour') // 60 + 1} min.",
            },
        )
    if d_count > d_lim:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "rate_limited",
                "scope": "session",
                "window": "day",
                "limit": d_lim,
                "used": d_count,
                "retry_after_sec": _seconds_until_next("day"),
                "message": f"Daily limit reached for {kind} ({d_lim}/day). Resets in "
                           f"{_seconds_until_next('day') // 3600 + 1} h.",
            },
        )

    # Per-IP backstop (combined across kinds)
    if request is not None:
        ip = _client_ip(request)
        ip_hour = _bucket("ip", ip, "hour")
        ip_count = await _incr(db, ip_hour)
        if ip_count > IP_HOUR_LIMIT:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "rate_limited",
                    "scope": "ip",
                    "window": "hour",
                    "limit": IP_HOUR_LIMIT,
                    "used": ip_count,
                    "retry_after_sec": _seconds_until_next("hour"),
                    "message": "Hourly IP limit reached. Try again later.",
                },
            )

    return {"hour": h_count, "day": d_count, "hour_limit": h_lim, "day_limit": d_lim}


async def usage_for(db, session_id: str) -> Dict[str, Dict[str, int]]:
    """Read-only snapshot of current usage / remaining quota across all kinds."""
    out: Dict[str, Dict[str, int]] = {}
    for kind, lims in LIMITS.items():
        h = await _peek(db, _bucket("sess", session_id, "hour", kind))
        d = await _peek(db, _bucket("sess", session_id, "day", kind))
        out[kind] = {
            "hour_used": h,
            "day_used": d,
            "hour_limit": lims["hour"],
            "day_limit": lims["day"],
            "hour_remaining": max(0, lims["hour"] - h),
            "day_remaining": max(0, lims["day"] - d),
            "hour_reset_in": _seconds_until_next("hour"),
            "day_reset_in": _seconds_until_next("day"),
        }
    out["_disabled"] = RL_DISABLED
    return out
