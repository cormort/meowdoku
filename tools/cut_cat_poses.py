#!/usr/bin/env python3
"""貓咪小屋：把 AI Studio（Nano Banana Pro）生成的動作立繪整理成遊戲素材。

為什麼需要這一步：`.room-cat-img` 是直接顯示 PNG（透明去背），AI 生圖輸出的是
RGB + 近白底。不去背就會在貓周圍看到一個白色方塊。

流程：邊緣洪水填充去背 → 清掉前景碎片 → 補掉被封閉的近底色色塊（例如雙腿之間）
→ alpha 邊緣柔化 → 裁切 → 等比縮放（以該品種 idle 立繪高度為基準，過寬的姿勢
再受 MAX_W 限制）→ 輸出 PNG 與 WebP。

用法：
    python3 tools/cut_cat_poses.py --source <生圖原始檔目錄> [--out icons/room] [--check]

來源檔名規則：<breed>_<pose>.png（breed = cat/orange/black/calico）。
尺寸基準取自既有的 icons/room/<breed>_idle.png，讓每個姿勢在畫面上大小一致。
"""
import argparse
import os
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
BREEDS = {"cat": "cat", "orange": "orange", "black": "black", "calico": "calico"}
POSES = ["walk", "run", "jump", "lick", "wash", "stretch", "tail", "yawn", "scratch", "eat"]

MAX_W = 430        # 輸出最大寬度：再寬在客廳裡會縮得太小（既有 play 立繪約 426～434）
PAD = 2
TOL = 46           # 與底色距離 < TOL 視為背景
HOLE_MAX_RATIO = 0.015   # 封閉同色塊最大面積比例（避免吃掉碗內食物等大面積淺色）
# 個別貼圖的特例：black_tail 的尾巴繞成一圈，圈內的背景色佔 2.52%，
# 被上面的上限擋掉，暗色房間底上會看到一個白塊。黑貓身上沒有大片白毛，
# 所以只針對這張放寬（不要整個品種放寬：白貓／三花的白毛、*_eat 的碗內食物都是大面積淺色）。
HOLE_RATIO_OVERRIDE = {"black_tail": 0.04}


def background_mask(a, tol=TOL):
    h, w, _ = a.shape
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg_color = np.median(border, axis=0)
    near = np.abs(a - bg_color).sum(axis=2) < tol
    mask = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near[y, x] and not mask[y, x]:
                mask[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if near[y, x] and not mask[y, x]:
                mask[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and near[ny, nx] and not mask[ny, nx]:
                mask[ny, nx] = True
                q.append((ny, nx))
    return mask, bg_color


def drop_small_blobs(mask, min_ratio=0.0002):
    fg = ~mask
    h, w = fg.shape
    seen = np.zeros_like(fg)
    keep = np.zeros_like(fg)
    min_px = max(16, int(h * w * min_ratio))
    for sy in range(h):
        for sx in range(w):
            if fg[sy, sx] and not seen[sy, sx]:
                comp, stack = [], [(sy, sx)]
                seen[sy, sx] = True
                while stack:
                    y, x = stack.pop()
                    comp.append((y, x))
                    for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                        if 0 <= ny < h and 0 <= nx < w and fg[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            stack.append((ny, nx))
                if len(comp) >= min_px:
                    for y, x in comp:
                        keep[y, x] = True
    return ~keep


def fill_enclosed_holes(mask, img, bg_color, tol=TOL, max_ratio=HOLE_MAX_RATIO):
    h, w = mask.shape
    near = np.abs(img - bg_color).sum(axis=2) < tol
    seen = np.zeros((h, w), bool)
    out = mask.copy()
    for sy in range(h):
        for sx in range(w):
            if near[sy, sx] and not seen[sy, sx]:
                comp, stack, touches = [], [(sy, sx)], False
                seen[sy, sx] = True
                while stack:
                    y, x = stack.pop()
                    comp.append((y, x))
                    if y in (0, h - 1) or x in (0, w - 1):
                        touches = True
                    for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                        if 0 <= ny < h and 0 <= nx < w and near[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            stack.append((ny, nx))
                if touches or len(comp) > h * w * max_ratio:
                    continue
                for y, x in comp:
                    out[y, x] = True
    return out


def cut(src, out_h, max_w=MAX_W):
    im = Image.open(src).convert("RGB")
    a = np.asarray(im).astype(int)
    mask, bg_color = background_mask(a)
    if mask.all():
        raise SystemExit(f"{src}: 整張都被判定成背景（底色 {bg_color}）")
    mask = drop_small_blobs(mask)
    mask = fill_enclosed_holes(mask, a, bg_color, max_ratio=HOLE_RATIO_OVERRIDE.get(Path(src).stem, HOLE_MAX_RATIO))
    rgba = np.dstack([np.asarray(im).astype(np.uint8), np.where(mask, 0, 255).astype(np.uint8)])
    out = Image.fromarray(rgba, "RGBA")
    out.putalpha(out.getchannel("A").filter(ImageFilter.GaussianBlur(0.8)))
    bbox = out.getchannel("A").point(lambda v: 255 if v > 12 else 0).getbbox()
    if not bbox:
        raise SystemExit(f"{src}: 去背後沒有前景")
    out = out.crop(bbox)
    k = min(out_h / out.height, max_w / out.width)
    out = out.resize((max(1, round(out.width * k)), max(1, round(out.height * k))), Image.LANCZOS)
    canvas = Image.new("RGBA", (out.width + PAD * 2, out.height + PAD * 2), (0, 0, 0, 0))
    canvas.paste(out, (PAD, PAD))
    return canvas, bg_color


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, help="生圖原始檔（2048×2048 PNG）目錄")
    ap.add_argument("--out", default=str(ROOT / "icons" / "room"))
    ap.add_argument("--webp-quality", type=int, default=86)
    ap.add_argument("--check", action="store_true", help="只報表，不寫檔")
    args = ap.parse_args()

    src_dir, out_dir = Path(args.source), Path(args.out)
    if not src_dir.is_dir():
        raise SystemExit(f"找不到來源目錄：{src_dir}")

    bases = {}
    for breed in BREEDS:
        ref = out_dir / f"{breed}_idle.png"
        if not ref.exists():
            raise SystemExit(f"缺少基準立繪 {ref}（決定輸出高度用）")
        bases[breed] = Image.open(ref).height

    done, missing = 0, []
    for breed in BREEDS:
        for pose in POSES:
            src = src_dir / f"{breed}_{pose}.png"
            if not src.exists():
                missing.append(f"{breed}_{pose}")
                continue
            img, bg = cut(src, bases[breed])
            alpha = img.getchannel("A")
            lo, hi = alpha.getextrema()
            opaque = sum(alpha.histogram()[249:]) * 100 // (img.width * img.height)
            report = (f"{breed}_{pose:8s} bg={tuple(int(v) for v in bg)}  {img.width}x{img.height}"
                      f"  alpha={lo}..{hi}  前景={opaque}%")
            if args.check:
                print(report)
                continue
            png = out_dir / f"{breed}_{pose}.png"
            img.save(png, optimize=True)
            img.save(out_dir / f"{breed}_{pose}.webp", quality=args.webp_quality, method=6)
            print(f"{report}  {png.stat().st_size // 1024}KB")
            done += 1
    if missing:
        print(f"! 缺少 {len(missing)} 個生圖檔：{', '.join(missing)}")
    if not args.check:
        print(f"完成 {done} 組（PNG + WebP）")


if __name__ == "__main__":
    sys.exit(main())
