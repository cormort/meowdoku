#!/usr/bin/env python3
"""process_avatar_sheets.py — 把 Nano Banana 產出的分類圖板切成遊戲用圖層

流程：切格 → 白底去背（從四邊 flood fill）→（頭髮／帽子再挖掉內部封閉白區）→
      修剪 → 依「身體框」的錨點縮放貼到 512x512 畫布 → 存到 icons/avatar/。
錨點是相對身體框的比例，要微調只改 ANCHORS。

用法：python3 tools/process_avatar_sheets.py [--preview]
"""
import sys
from collections import deque
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = Path("/tmp/avatar_gen")
OUT = ROOT / "icons" / "avatar"
W = H = 512
TREAT = 10  # 白底判斷容差（要緊一點，否則白色衣服會被一起吃掉）
CANVAS_INK = 8  # 這條線以下的亮度當成「封閉白區」挖掉

# 圖板 → (欄數, 列數, [(格號, 檔名)], 是否挖掉封閉白區)
# AI Studio 的圖板是 3x3；網頁 Gemini 的是 4x2（格號＝列*欄+行）
SHEETS = {
    "hair": (3, 3, [(0, "hair_short"), (1, "hair_bob"), (2, "hair_twin"), (3, "hair_pony"), (4, "hair_curly"), (5, "hair_bowl")], True),
    "tops": (3, 3, [(0, "top_tshirt"), (1, "top_hoodie"), (2, "top_shirt"), (3, "top_sailor"), (4, "top_sweater"), (5, "top_vest")], False),
    "bottoms": (4, 2, [(0, "bottom_jeans"), (1, "bottom_shorts"), (2, "bottom_skirt"), (4, "bottom_pleat"), (5, "bottom_sport")], False),
    # AI 只畫了四雙（球鞋／短靴／皮鞋／涼鞋），雨鞋沒有 → 沿用先前版本
    "shoes": (3, 3, [(0, "shoes_sneaker"), (1, "shoes_boots"), (3, "shoes_loafer"), (4, "shoes_sandal")], False),
    "hats": (4, 2, [(0, "hat_cap"), (1, "hat_beanie"), (2, "hat_straw"), (4, "hat_beret"), (5, "hat_bow")], True),
    "accessories": (4, 2, [(0, "acc_glasses"), (1, "acc_scarf"), (2, "acc_backpack"), (4, "acc_headphone"), (5, "acc_badge")], False),
}
SHEET_ALIAS = {"accessories": ["accessories", "acc"]}

# 以「量到的身體」對齊：head 是頭（肩膀以上）、shoulder 是脖子的位子、
# feet 是腳底。w 是相對頭寬的比例，dy 是相對身體高度的微調。
ANCHORS = {
    "hair": {"line": "head_top", "dy": -0.05, "w": 1.06},
    "hat": {"line": "head_top", "dy": -0.12, "w": 1.14},
    "top": {"line": "shoulder", "dy": -0.03, "w": 1.02},
    "bottom": {"line": "hip", "dy": -0.02, "w": 0.92},
    "shoes": {"line": "feet", "dy": 0.00, "w": 0.66},
    "acc_glasses": {"line": "eye", "dy": -0.01, "w": 0.64},
    "acc_scarf": {"line": "neck", "dy": 0.03, "w": 0.92},
    "acc_backpack": {"line": "shoulder", "dy": -0.04, "w": 1.40},
    "acc_headphone": {"line": "head_top", "dy": 0.00, "w": 1.18},
    "acc_badge": {"line": "chest", "dy": 0.00, "w": 0.30},
}


def measure(canvas):
    """量出頭、肩、腰、腳的位置（用 alpha 每列寬度找脖子最窄處）。"""
    a = canvas.getchannel("A")
    w, h = a.size
    px = a.load()
    rows = []
    for y in range(h):
        xs = [x for x in range(w) if px[x, y] > 120]
        rows.append((min(xs), max(xs), len(xs)) if xs else None)
    ys = [y for y, r in enumerate(rows) if r]
    if not ys:
        return None
    top, bottom = ys[0], ys[-1]
    body_h = bottom - top
    # 脖子：從 top 往下 20%~55% 之間最窄的一列
    cand = [(rows[y][1] - rows[y][0], y) for y in range(top + int(body_h * 0.18), top + int(body_h * 0.55)) if rows[y]]
    neck_w, neck_y = min(cand) if cand else (0, top + int(body_h * 0.3))
    head_rows = [rows[y] for y in range(top, neck_y) if rows[y]]
    head_w = max((r[1] - r[0]) for r in head_rows) if head_rows else 0
    head_h = neck_y - top
    return {
        "top": top, "bottom": bottom, "body_h": body_h,
        "head_top": top, "head_h": head_h, "head_w": head_w,
        "neck": neck_y, "shoulder": neck_y + int(body_h * 0.02),
        "eye": top + int(head_h * 0.62), "chest": neck_y + int(body_h * 0.16),
        "hip": top + int(body_h * 0.78), "feet": bottom,
        "cx": (rows[top][0] + rows[top][1]) // 2,
    }


def erase_face(sprite, m, box, pos):
    """把頭髮在臉部（眼睛以下、臉的中央）挖空，免得蓋住眼睛。"""
    x0, y0 = pos
    face_w = m["head_w"] * 0.62
    fx0 = int(m["cx"] - face_w / 2 - x0)
    fx1 = int(m["cx"] + face_w / 2 - x0)
    fy0 = int(m["eye"] - m["head_h"] * 0.02 - y0)
    fy1 = int(m["bottom"] - y0)
    mask = sprite.split()[3]
    d = ImageDraw.Draw(mask)
    if fx1 > fx0 and fy1 > fy0:
        d.rounded_rectangle((fx0, fy0, fx1, fy1), radius=int(face_w * 0.28), fill=0)
    sprite.putalpha(mask)
    return sprite


def _is_white(px, tol=TREAT):
    return px[0] > 255 - tol and px[1] > 255 - tol and px[2] > 255 - tol


def _close(px, ref, tol):
    return abs(px[0] - ref[0]) <= tol and abs(px[1] - ref[1]) <= tol and abs(px[2] - ref[2]) <= tol


def cut_white(im, kill_holes=False):
    """去背：從四邊往內擴散，顏色和白／與目前區塊相近的都當背景。
    AI 有時會在格子裡鋪一塊彩色底，這種「連到邊界 + 顏色一致」的區域也會被清掉。
    kill_holes 再把內部封閉的白區挖掉（AI 順手畫的臉型輪廓）。"""
    im = im.convert("RGB")
    w, h = im.size
    px = im.load()
    bg = bytearray(w * h)
    q = deque()

    def seed(x, y):
        i = y * w + x
        if bg[i]:
            return
        c = px[x, y]
        bg[i] = 1
        q.append((x, y, c))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)
    while q:
        x, y, c = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                j = ny * w + nx
                if bg[j]:
                    continue
                p2 = px[nx, ny]
                # 只吃白色，不做顏色蔓延（否則會順著柔和陰影把角色本身吃掉）
                if _is_white(p2):
                    bg[j] = 1
                    q.append((nx, ny, c))
    alpha = bytearray(255 - 255 * v for v in bg)
    if kill_holes:
        # 找出「沒連到邊界、又幾乎純白」的封閉小區塊（AI 畫的臉型）→ 挖掉
        seen = bytearray(w * h)
        for sy in range(h):
            for sx in range(w):
                i = sy * w + sx
                if seen[i] or bg[i]:
                    continue
                comp = []
                dq = deque([(sx, sy)])
                seen[i] = 1
                while dq:
                    x, y = dq.popleft()
                    comp.append((x, y))
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            j = ny * w + nx
                            if not seen[j] and not bg[j] and _is_white(px[nx, ny], 12):
                                seen[j] = 1
                                dq.append((nx, ny))
                if len(comp) > 400:
                    for x, y in comp:
                        alpha[y * w + x] = 0
    # 封閉、面積大、而且有彩度的區塊 = AI 自己加的彩色底 → 也挖掉
    seen2 = bytearray(w * h)
    for sy in range(0, h, 3):
        for sx in range(0, w, 3):
            i = sy * w + sx
            if seen2[i] or bg[i]:
                continue
            comp, dq = [], deque([(sx, sy)])
            seen2[i] = 1
            while dq:
                x, y = dq.popleft()
                comp.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        j = ny * w + nx
                        if not seen2[j] and not bg[j] and _close(px[nx, ny], px[sx, sy], 26):
                            seen2[j] = 1
                            dq.append((nx, ny))
            if len(comp) > 1500:
                c = px[sx, sy]
                if max(c) - min(c) > 22:  # 有彩度 → 是彩色底不是線稿
                    for x, y in comp:
                        alpha[y * w + x] = 0
    # AI 有時會在格子裡畫一張底色卡（白或淡彩、大、接近矩形）→ 清掉
    seen3 = bytearray(w * h)
    for sy in range(0, h, 2):
        for sx in range(0, w, 2):
            i = sy * w + sx
            if seen3[i] or bg[i]:
                continue
            c0 = px[sx, sy]
            comp, dq = [], deque([(sx, sy)])
            seen3[i] = 1
            minx = maxx = sx
            miny = maxy = sy
            while dq:
                x, y = dq.popleft()
                comp.append((x, y))
                minx, maxx = min(minx, x), max(maxx, x)
                miny, maxy = min(miny, y), max(maxy, y)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        j = ny * w + nx
                        if not seen3[j] and not bg[j] and px[nx, ny][0] > 225 and px[nx, ny][1] > 225 and px[nx, ny][2] > 225 and _close(px[nx, ny], c0, 22):
                            seen3[j] = 1
                            dq.append((nx, ny))
            area = len(comp)
            box_area = max(1, (maxx - minx + 1) * (maxy - miny + 1))
            span_x = (maxx - minx + 1) / w
            span_y = (maxy - miny + 1) / h
            uniform = all(abs(v - c0[k]) < 26 for x, y in comp[:: max(1, len(comp) // 400)] for k, v in enumerate(px[x, y]))
            if area > 8000 and area / box_area > 0.82 and span_x > 0.62 and span_y > 0.62 and uniform:
                for x, y in comp:
                    alpha[y * w + x] = 0
    out = im.convert("RGBA")
    out.putalpha(Image.frombytes("L", (w, h), bytes(alpha)).filter(ImageFilter.GaussianBlur(0.5)))
    return out


def drop_pastel_card(layer):
    """去掉圖層裡殘留的淡彩底卡（例如淡藍／淡紫矩形）：衣服本身是白／灰（幾乎無彩度），
    所以「又亮又有彩度」的像素就是卡片。取中位數顏色後整片清成透明。"""
    rgba = layer.convert("RGBA")
    a = rgba.getchannel("A")
    px = rgba.load()
    w, h = rgba.size
    cand = []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            if a.getpixel((x, y)) < 200:
                continue
            r, g, b = px[x, y][:3]
            lo, hi = min(r, g, b), max(r, g, b)
            if hi > 200 and 6 < (hi - lo) < 70:
                cand.append((r, g, b, x, y))
    if len(cand) * 4 < 5000:
        return layer
    rs = sorted(c[0] for c in cand)
    gs = sorted(c[1] for c in cand)
    bs = sorted(c[2] for c in cand)
    mid = (rs[len(rs) // 2], gs[len(gs) // 2], bs[len(bs) // 2])
    alpha = a.copy()
    ap = alpha.load()
    removed = 0
    for r, g, b, x, y in cand:
        if abs(r - mid[0]) < 20 and abs(g - mid[1]) < 20 and abs(b - mid[2]) < 20:
            ap[x, y] = 0
            removed += 1
    if removed * 4 > 5000:
        rgba.putalpha(alpha)
        return rgba
    return layer


def trim(im):
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def cell(sheet, i, cols=3, rows=3):
    cw, ch = sheet.width // cols, sheet.height // rows
    return sheet.crop(((i % cols) * cw, (i // cols) * ch, (i % cols + 1) * cw, (i // cols + 1) * ch))


def find_sheet(key):
    for name in SHEET_ALIAS.get(key, [key]):
        f = SRC / f"{name}.png"
        if f.exists():
            return f
    return None


def fit_base(base):
    """把基本身體放進畫布：高度佔 94%，水平置中。"""
    r = (H * 0.86) / base.height
    b = base.resize((max(1, int(base.width * r)), max(1, int(base.height * r))), Image.LANCZOS)
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    canvas.alpha_composite(b, ((W - b.width) // 2, int(H * 0.11)))
    return canvas


def place(item, sprite, m):
    key = item if item in ANCHORS else item.rsplit("_", 1)[0]
    a = ANCHORS[key]
    if key == "top":
        target_h = (m["hip"] - m["shoulder"]) * 1.18
        r = target_h / sprite.height
    elif key == "bottom":
        target_h = (m["feet"] - m["hip"]) * 1.02
        r = target_h / sprite.height
    else:
        r = (m["head_w"] * a["w"]) / sprite.width
    sprite = sprite.resize((max(1, int(sprite.width * r)), max(1, int(sprite.height * r))), Image.LANCZOS)
    cx = m["cx"] - sprite.width // 2
    if key in ("hair", "hat") or key.startswith("acc_"):
        cy = int(m[a["line"]] + m["head_h"] * a["dy"])
    elif key == "shoes":
        cy = int(m[a["line"]] + m["body_h"] * a["dy"]) - sprite.height
    else:
        cy = int(m[a["line"]] + m["body_h"] * a["dy"])
    return sprite, (cx, cy)


def main():
    preview = "--preview" in sys.argv
    out_dir = Path("/tmp/avatar_gen/preview_out") if preview else OUT
    out_dir.mkdir(parents=True, exist_ok=True)
    base_file = SRC / "base_g4.png"
    if not base_file.exists():
        base_file = SRC / "base.png"
    base_canvas = fit_base(trim(cut_white(Image.open(base_file))))
    base_canvas.save(out_dir / "base_g4.png")
    print(f"參考身體（四年級）<= {base_file.name}")
    m = measure(base_canvas)
    print("量測", m)
    # 各年級身體：base_g4 … base_g9（各自量測後貼進畫布，輸出量測值表）
    metrics = {}
    for g in range(4, 10):
        f = SRC / f"base_g{g}.png"
        if not f.exists():
            continue
        canvas = fit_base(trim(cut_white(Image.open(f))))
        canvas.save(OUT / f"base_g{g}.png")
        mm = measure(canvas)
        if mm:
            metrics[f"g{g}"] = {
                "headTop": round(mm["head_top"] / H, 3), "headW": round(mm["head_w"] / W, 3),
                "shoulder": round(mm["shoulder"] / H, 3), "hip": round(mm["hip"] / H, 3), "feet": round(mm["feet"] / H, 3),
            }
    if metrics:
        print("STAGE_METRICS = " + str(metrics).replace("'", '"'))
    made = ["base"]
    for sheet_key, (cols, rows, names, holes) in SHEETS.items():
        f = find_sheet(sheet_key)
        if not f:
            print(f"缺 {sheet_key}，跳過")
            continue
        sheet = Image.open(f)
        for i, name in names:
            sprite = trim(cut_white(cell(sheet, i, cols, rows), kill_holes=holes))
            sprite, pos = place(name, sprite, m)
            if name.startswith("hair_"):
                sprite = erase_face(sprite, m, None, pos)
            canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            canvas.alpha_composite(sprite, pos)
            canvas.save(out_dir / f"{name}.png")
            made.append(name)
    print(f"輸出 {len(made)} 張到 {out_dir}")
    if preview:
        combos = [
            ["base", "bottom_jeans", "shoes_sneaker", "top_tshirt", "hair_short"],
            ["base", "bottom_skirt", "shoes_loafer", "top_sailor", "hair_bob", "hat_straw"],
            ["base", "bottom_sport", "shoes_rainboot", "top_hoodie", "hair_pony"],
            ["base", "bottom_pleat", "shoes_boots", "top_sweater", "hair_curly", "hat_beret"],
            ["base", "bottom_shorts", "shoes_sandal", "top_vest", "hair_twin", "hat_bow"],
            ["acc_backpack", "base", "bottom_jeans", "shoes_sneaker", "top_shirt", "hair_bowl", "acc_glasses"],
        ]
        sheet = Image.new("RGBA", (W * 3, H * 2), (253, 243, 227, 255))
        for i, combo in enumerate(combos):
            c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            for name in combo:
                f = (OUT / f"{name}.png") if name == "base" else (out_dir / f"{name}.png")
                f = out_dir / f"{name}.png" if (out_dir / f"{name}.png").exists() else f
                if f.exists():
                    c.alpha_composite(Image.open(f).convert("RGBA"))
            sheet.alpha_composite(c, ((i % 3) * W, (i // 3) * H))
        sheet.convert("RGB").resize((W * 3 // 2, H), Image.LANCZOS).save("/tmp/avatar_gen/preview.png")
        print("預覽 /tmp/avatar_gen/preview.png")


if __name__ == "__main__":
    main()
