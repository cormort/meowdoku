#!/usr/bin/env python3
"""avatar_hair.py — 重畫髮型的前後處理（搭配 tools/gen_avatar_hair.js）

作法：不再畫「髮型圖板」再猜位置，而是讓 AI 直接在四年級身體的光頭上畫頭髮，
畫完用顏色把頭髮摳出來，位置天生就對齊 base_g4。
- 參考圖：base_g4 的頭＋肩（穿淡藍上衣），鋪滿純綠底。綠底、膚色、藍衣服都有彩度，
  AI 畫的頭髮規定是白／灰（遊戲裡再上色），所以「沒有彩度」的像素就是頭髮。
- 眼睛、線稿也沒彩度：跟參考圖比，和參考圖幾乎一樣的就不算頭髮。
- AI 輸出的大小、位置可能略有不同：比對綠底／皮膚／藍上衣的色塊自動找縮放與平移對回去。

用法：
  python3 tools/avatar_hair.py ref               # 產生 /tmp/avatar_ref/hair_head.png
  （跑 tools/gen_avatar_hair.js，輸出 /tmp/avatar_gen/hair/<id>.png）
  python3 tools/avatar_hair.py process [id ...]  # 摳圖 → icons/avatar/hair_<id>.png → 產生後髮
  python3 tools/avatar_hair.py process --preview # 只輸出預覽，不覆蓋 icons/
需要 Pillow、numpy；process 最後會呼叫 node tools/split_avatar_hair.mjs --fresh。
"""
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
AV = ROOT / "icons" / "avatar"
REF = Path("/tmp/avatar_ref/hair_head.png")
GEN = Path("/tmp/avatar_gen/hair")
W = H = 512
# 參考圖從 512 畫布（g4 座標）裁哪一塊：頭＋肩，留空間給長髮
CROP = (106, 20, 406, 320)  # x0, y0, x1, y1（正方形）
SIDE = 1024  # 參考圖邊長
GREEN = (0, 177, 64)
SHIRT = (156, 195, 230)  # 淡藍上衣，讓衣服有彩度、不會被當成頭髮
SAT_MAX = 30  # 彩度（RGB 最大減最小）低於這個算「白／灰」＝頭髮；AI 的頭髮偏米色時可以調高


def build_ref():
    base = Image.open(AV / "base_g4.png").convert("RGBA")
    top = Image.open(AV / "top_tshirt.png").convert("RGBA")
    # 上衣上色（multiply），再疊頭（跟遊戲一樣：頭和脖子在領口前面）
    shirt = Image.fromarray((np.asarray(top.convert("RGB"), np.float32) * np.asarray(SHIRT, np.float32) / 255).astype(np.uint8)).convert("RGBA")
    shirt.putalpha(top.getchannel("A"))
    canvas = Image.new("RGBA", (W, H), GREEN + (255,))
    canvas.alpha_composite(base)
    canvas.alpha_composite(shirt)
    head = base.copy()
    mask = Image.new("L", (W, H), 0)
    mask.paste(255, (0, 0, W, 207 + 12))  # 脖子以上
    head.putalpha(Image.fromarray(np.minimum(np.asarray(head.getchannel("A")), np.asarray(mask))))
    canvas.alpha_composite(head)
    ref = canvas.crop(CROP).resize((SIDE, SIDE), Image.LANCZOS).convert("RGB")
    REF.parent.mkdir(parents=True, exist_ok=True)
    ref.save(REF)
    print(f"參考圖 {REF}（{SIDE}x{SIDE}）")


def classes(img, n):
    """縮成 n x n 後分類：1 綠底、2 皮膚、3 藍上衣、0 其他（頭髮、線稿 → 對位時不算）"""
    a = np.asarray(img.resize((n, n), Image.BILINEAR), np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    out = np.zeros((n, n), np.int8)
    out[(g - np.maximum(r, b)) > 40] = 1
    out[(r > 170) & (r - b > 25) & (r >= g) & (g >= b - 10)] = 2
    out[(b > r + 30) & (b > 150) & (g > r)] = 3
    return out


def _best(gc, rc, scales, offs):
    n = len(gc)
    ys, xs = np.nonzero(rc > 0)
    want = rc[ys, xs]
    best = ((-1.0, 0), 1.0, 0.0, 0.0)
    for s in scales:
        for dy in offs[1]:
            gy = np.round((ys - n / 2) * s + n / 2 + dy).astype(int)
            okY = (gy >= 0) & (gy < n)
            for dx in offs[0]:
                gx = np.round((xs - n / 2) * s + n / 2 + dx).astype(int)
                ok = okY & (gx >= 0) & (gx < n)
                got = np.zeros_like(want)
                got[ok] = gc[gy[ok], gx[ok]]
                # 頭髮、線稿的地方 got=0，不算對也不算錯；先比「對的比例」，同分再比「對的數量」
                hit = int((got == want).sum())
                miss = int(((got > 0) & (got != want)).sum())
                score = (round(hit / max(1, hit + miss), 3), hit)
                if score > best[0]:
                    best = (score, s, dx, dy)
    return best


def register(gen, ref):
    """找出 gen → ref 的縮放 s 與平移 (dx, dy)（ref 像素座標 p 對到 gen 的 (p - c) * s + c + d）。
    比的是綠底／皮膚／藍上衣三種顏色區塊，頭髮和線稿不算，所以頭髮蓋住臉不影響對位。
    先在 64x64 粗找，再到 256、512 細修。"""
    n = 64
    _, s, dx, dy = _best(classes(gen, n), classes(ref, n), np.arange(0.80, 1.21, 0.02), (range(-12, 13), range(-12, 13)))
    n2 = 256
    k = n2 / n
    score, s, dx, dy = _best(
        classes(gen, n2), classes(ref, n2), np.arange(s - 0.02, s + 0.021, 0.005),
        (np.arange(dx * k - 4, dx * k + 5), np.arange(dy * k - 4, dy * k + 5)),
    )
    n3 = 512
    score, s, dx, dy = _best(
        classes(gen, n3), classes(ref, n3), np.arange(s - 0.006, s + 0.0061, 0.003),
        (np.arange(dx * 2 - 2, dx * 2 + 3), np.arange(dy * 2 - 2, dy * 2 + 3)),
    )
    print(f"  對位吻合 {score[0]:.1%}")
    return s, dx * SIDE / n3, dy * SIDE / n3


def warp(gen, s, dx, dy):
    """把 gen 轉回 ref 座標（SIDE x SIDE）"""
    c = SIDE / 2
    # PIL 的 affine 是 output → input：x_in = a*x + b*y + c0
    return gen.transform((SIDE, SIDE), Image.AFFINE, (s, 0, c - c * s + dx, 0, s, c - c * s + dy), resample=Image.BICUBIC, fillcolor=GREEN)


def extract(gen, ref):
    a = np.asarray(gen, np.int16)
    rf = np.asarray(ref, np.int16)
    sat = a.max(-1) - a.min(-1)
    green = (a[..., 1] - np.maximum(a[..., 0], a[..., 2])) > 40
    neutral = (sat < SAT_MAX) & ~green
    same = np.abs(a - rf).max(-1) < 40
    ref_neutral = (rf.max(-1) - rf.min(-1)) < SAT_MAX
    hair = neutral & ~(same & ref_neutral)
    # 只留跟最大塊連在一起的（眼睛、雜點會掉）
    from collections import deque
    lab = np.zeros(hair.shape, np.int32)
    sizes = [0]
    h, w = hair.shape
    for sy in range(0, h, 2):
        for sx in range(0, w, 2):
            if not hair[sy, sx] or lab[sy, sx]:
                continue
            idx = len(sizes)
            sizes.append(0)
            q = deque([(sy, sx)])
            lab[sy, sx] = idx
            while q:
                y, x = q.popleft()
                sizes[idx] += 1
                for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= ny < h and 0 <= nx < w and hair[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = idx
                        q.append((ny, nx))
    big = max(sizes)
    keep = np.isin(lab, [i for i, n in enumerate(sizes) if n > big * 0.02 and i])
    lum = (a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11).clip(0, 255).astype(np.uint8)
    alpha = Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    out = Image.merge("RGBA", (Image.fromarray(lum),) * 3 + (alpha,))
    # 縮回 512 畫布（g4 座標）
    size = CROP[2] - CROP[0]
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    canvas.alpha_composite(out.resize((size, size), Image.LANCZOS), (CROP[0], CROP[1]))
    return canvas


def preview(ids, out_dir):
    base = Image.open(AV / "base_g4.png").convert("RGBA")
    colors = [(58, 47, 42), (138, 90, 52), (232, 138, 168)]
    sheet = Image.new("RGB", (300 * len(ids), 300 * len(colors)), (122, 156, 198))
    for i, hid in enumerate(ids):
        for j, col in enumerate(colors):
            c = Image.new("RGBA", (W, H), (122, 156, 198, 255))
            for name in (f"hairback_{hid}", None, f"hair_{hid}"):
                if name is None:
                    c.alpha_composite(base)
                    continue
                f = out_dir / f"{name}.png"
                if not f.exists():
                    continue
                im = Image.open(f).convert("RGBA")
                rgb = (np.asarray(im.convert("RGB"), np.float32) * np.asarray(col, np.float32) / 255).astype(np.uint8)
                t = Image.fromarray(rgb).convert("RGBA")
                t.putalpha(im.getchannel("A"))
                c.alpha_composite(t)
            sheet.paste(c.crop(CROP).convert("RGB"), (i * 300, j * 300))
    path = GEN / "preview.png"
    sheet.save(path)
    print(f"預覽 {path}")


def process(args):
    dry = "--preview" in args
    ids = [a for a in args if not a.startswith("--")] or sorted(p.stem for p in GEN.glob("*.png") if p.stem != "preview")
    if not REF.exists():
        build_ref()
    ref = Image.open(REF).convert("RGB")
    out_dir = GEN / "out" if dry else AV
    out_dir.mkdir(parents=True, exist_ok=True)
    done = []
    for hid in ids:
        f = GEN / f"{hid}.png"
        if not f.exists():
            print(f"缺 {f}，跳過")
            continue
        gen = Image.open(f).convert("RGB")
        if gen.size != (SIDE, SIDE):
            gen = gen.resize((SIDE, SIDE), Image.LANCZOS)
        s, dx, dy = register(gen, ref)
        hair = extract(warp(gen, s, dx, dy), ref)
        hair.save(out_dir / f"hair_{hid}.png")
        n = int((np.asarray(hair.getchannel("A")) > 128).sum())
        print(f"hair_{hid}: 縮放 {s:.2f} 平移 ({dx:+.0f}, {dy:+.0f})，頭髮 {n} px")
        done.append(hid)
    if done:
        cmd = ["node", str(ROOT / "tools" / "split_avatar_hair.mjs"), "--fresh"] + (["--dir", str(out_dir)] if dry else []) + done
        subprocess.run(cmd, check=True)
        preview(done, out_dir)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "ref":
        build_ref()
    elif len(sys.argv) > 1 and sys.argv[1] == "process":
        process(sys.argv[2:])
    else:
        print(__doc__)
