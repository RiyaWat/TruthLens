"""OG share-card image generation for TruthLens scan results."""
import io
from typing import Dict
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for c in candidates:
        if Path(c).exists():
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


CLS_COLORS = {
    "HUMAN": (0, 255, 102),
    "AI": (255, 184, 0),
    "DEEPFAKE": (255, 59, 48),
    "UNCERTAIN": (161, 161, 170),
}

TYPE_LABEL = {
    "text": "TEXT FORENSICS",
    "image": "IMAGE FORENSICS",
    "video": "VIDEO FORENSICS",
    "url": "URL FORENSICS",
}


def render_og(scan: Dict) -> bytes:
    W, H = 1200, 630
    bg = (10, 10, 10)
    cyan = (0, 229, 255)
    img = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(img)

    # forensic grid background
    grid = (255, 255, 255, 18)
    grid_step = 56
    for x in range(0, W, grid_step):
        d.line([(x, 0), (x, H)], fill=(20, 20, 20), width=1)
    for y in range(0, H, grid_step):
        d.line([(0, y), (W, y)], fill=(20, 20, 20), width=1)

    cls = (scan.get("classification") or "UNCERTAIN").upper()
    color = CLS_COLORS.get(cls, CLS_COLORS["UNCERTAIN"])
    score = int(scan.get("score") or 0)

    # cyan top bar
    d.rectangle([0, 0, W, 8], fill=cyan)

    # brand row
    d.rectangle([60, 50, 86, 76], fill=(0, 0, 0), outline=cyan, width=2)
    d.text((96, 51), "TRUTHLENS", fill=(255, 255, 255), font=_font(20, bold=True))
    d.text((230, 56), "AI-ASSISTED SCAN", fill=cyan, font=_font(14, bold=True))

    # type label
    d.text((60, 110), TYPE_LABEL.get(scan.get("type") or "", "FORENSIC REPORT"),
           fill=(150, 150, 160), font=_font(16, bold=True))

    # huge score
    score_text = f"{score}"
    score_font = _font(280, bold=True)
    sw = d.textlength(score_text, font=score_font)
    d.text((60, 170), score_text, fill=color, font=score_font)
    d.text((60 + sw + 10, 320), "%", fill=(255, 255, 255), font=_font(64, bold=True))

    # right column text
    rx = 620

    # classification tag
    tag_font = _font(34, bold=True)
    tag_w = int(d.textlength(cls, font=tag_font)) + 28
    d.rectangle([rx, 180, rx + tag_w, 232], outline=color, width=2)
    d.text((rx + 14, 188), cls, fill=color, font=tag_font)

    # confidence
    conf = int(scan.get("confidence") or 0)
    d.text((rx, 254), f"CONFIDENCE  {conf}%", fill=(150, 150, 160), font=_font(18, bold=True))
    d.rectangle([rx, 282, rx + 360, 290], fill=(40, 40, 40))
    d.rectangle([rx, 282, rx + int(360 * conf / 100), 290], fill=color)

    # summary (wrap to 3 lines)
    summary = (scan.get("summary") or "").strip()
    _wrap(d, summary, rx, 318, 520, _font(22), fill=(230, 230, 230), max_lines=4, line_h=30)

    # bottom row
    by = H - 90
    d.line([(60, by - 18), (W - 60, by - 18)], fill=(40, 40, 40), width=1)
    d.text((60, by), "TruthLens · Counter-Deepfake Intelligence", fill=cyan, font=_font(18, bold=True))
    lang = scan.get("language") or "—"
    d.text((W - 60, by), f"LANG · {lang}", fill=(150, 150, 160), font=_font(18, bold=True), anchor="ra")

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()


def _wrap(d, text, x, y, max_w, font, fill, max_lines=3, line_h=28):
    words = (text or "").split()
    line = ""
    drawn = 0
    for w in words:
        test = (line + " " + w).strip()
        if d.textlength(test, font=font) <= max_w:
            line = test
        else:
            d.text((x, y + drawn * line_h), line, fill=fill, font=font)
            drawn += 1
            line = w
            if drawn >= max_lines - 1:
                # last line — append ellipsis if still words remain
                remaining = " ".join(words[words.index(w):])
                while d.textlength(remaining + "…", font=font) > max_w and len(remaining) > 4:
                    remaining = remaining[:-1]
                d.text((x, y + drawn * line_h), remaining + ("…" if remaining != " ".join(words[words.index(w):]) else ""),
                       fill=fill, font=font)
                return
    if line:
        d.text((x, y + drawn * line_h), line, fill=fill, font=font)
