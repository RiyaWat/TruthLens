"""Pre-filter heuristics — cheap local checks before the LLM is called."""
import re
import io
import base64
from typing import Dict, List, Optional, Tuple
from PIL import Image, ImageStat


# Obvious AI/LLM phrases that strongly suggest synthetic text.
AI_TELL_PATTERNS = [
    re.compile(r"\bas an? ai (?:language )?model\b", re.I),
    re.compile(r"\bi('m| am) (?:just )?an? ai\b", re.I),
    re.compile(r"\bas a large language model\b", re.I),
    re.compile(r"\bi do(?:n['’]t| not) have personal (?:opinions|feelings|experiences)\b", re.I),
    re.compile(r"\bi cannot (?:provide|generate|create) (?:real-time|current)\b", re.I),
    re.compile(r"\bmy (?:training data|knowledge cutoff)\b", re.I),
    re.compile(r"\bcertainly!? here(?:'?s| is)\b", re.I),
    re.compile(r"\bin conclusion,\s.*\bin summary\b", re.I | re.S),
    re.compile(r"\bleveraging cutting-edge\b", re.I),
    re.compile(r"\bunlock(?:ing)? unprecedented (?:opportunities|potential)\b", re.I),
]


def text_prefilter(text: str) -> Dict[str, object]:
    """Cheap heuristics for AI-text. Returns flags + suggested score boost."""
    flags: List[str] = []
    if not text:
        return {"flags": flags, "boost": 0, "short_circuit": None}
    sample = text.strip()
    for pat in AI_TELL_PATTERNS:
        if pat.search(sample):
            flags.append(f"phrase:{pat.pattern[:50]}")
    # cheap stylistic ratios
    sentences = re.split(r"(?<=[.!?])\s+", sample)
    long_sent = sum(1 for s in sentences if len(s.split()) > 28)
    if long_sent and len(sentences) and (long_sent / len(sentences)) > 0.5:
        flags.append("style:long-balanced-sentences")
    boost = min(20, 6 * len(flags))
    return {"flags": flags, "boost": boost, "short_circuit": None}


def image_prefilter_b64(b64: str) -> Dict[str, object]:
    """Reject blank / uniform-variance images cheaply."""
    flags: List[str] = []
    short: Optional[Dict[str, object]] = None
    try:
        raw = base64.b64decode(b64)
        img = Image.open(io.BytesIO(raw))
        if img.mode != "RGB":
            img = img.convert("RGB")
        stat = ImageStat.Stat(img.resize((128, 128)))
        # average per-channel stddev
        stddev = sum(stat.stddev) / 3
        if stddev < 4.0:
            flags.append("image:uniform-color")
            short = {
                "score": 50,
                "classification": "UNCERTAIN",
                "confidence": 25,
                "summary": "Image is essentially blank/uniform — not enough signal to classify.",
                "reasoning": "Pre-filter detected near-zero pixel variance across the image. "
                             "This usually indicates a solid-color or empty canvas, where "
                             "AI/deepfake forensic markers cannot be evaluated.",
                "markers": [{
                    "label": "uniform-canvas",
                    "detail": f"std-dev across RGB channels was {stddev:.2f} (threshold 4.0).",
                    "severity": "info",
                }],
                "language": None,
            }
    except Exception:
        pass
    return {"flags": flags, "short_circuit": short}
