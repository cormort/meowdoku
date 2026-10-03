#!/usr/bin/env python3
"""recolor_neck_shadow.py — 把各年級身體圖（base_g4…g9）下巴底下的桃紅陰影改成膚色陰影

問題：AI 重畫的身體圖把下巴陰影畫成飽和桃紅（例如 rgb(252,181,167)，彩度 0.34），
臉的膚色卻是 rgb(255,225,201)（彩度 0.21）。當 js/avatar.js 把「頭＋脖子」用 clip-path
疊到上衣領口前面時，這條陰影整個露在領口上方，在遊戲裡看起來像一塊紅斑（像瘀血或口紅）。

作法：只在「脖子那條窄帶」內動手——用 js/avatar.js 的 STAGE_METRICS（neck / collar /
neckL / neckR）圈出下巴與領口之間的矩形，把其中「亮、飽和、偏紅」的像素彩度降到接近
膚色的 0.22（保留一點暖度與原本明度），深色線稿與頭髮（暗、明度低）一律不動。

用法：
  python3 tools/recolor_neck_shadow.py --check     # 只報告會動到幾個像素（不改檔）
  python3 tools/recolor_neck_shadow.py             # 改寫 icons/avatar/base_g4…g9.png
  python3 tools/recolor_neck_shadow.py --diff-bbox # 改完印出與原圖差異的範圍，確認只在脖子帶內
"""
import argparse
import colorsys
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
AV = ROOT / "icons" / "avatar"
AVATAR_JS = ROOT / "js" / "avatar.js"

TARGET_SAT = 0.22   # 膚色本身的彩度（rgb 255,225,201）
KEEP_WARMTH = 0.12  # 保留多少原本超出膚色的暖度（0＝完全降到膚色彩度）
MIN_VALUE = 0.75    # 明度下限：深色線稿／頭髮不動
MIN_SAT = 0.25      # 彩度下限：一般膚色（0.21）不動
MIN_RED = 200       # 紅色下限：避免動到偏暗的棕髮
MIN_BLUE = 120      # 藍色下限：避免動到橘棕色


def stage_metrics():
    """從 js/avatar.js 讀 STAGE_METRICS，避免兩份數字各寫一次。"""
    src = AVATAR_JS.read_text(encoding="utf-8")
    block = re.search(r"STAGE_METRICS\s*=\s*\{(.*?)\n\};", src, re.S).group(1)
    out = {}
    for m in re.finditer(r"(g\d):\s*\{([^}]*)\}", block):
        stage, body = m.group(1), m.group(2)
        vals = {k: float(v) for k, v in re.findall(r"(\w+):\s*([\d.]+)", body)}
        out[stage] = vals
    return out


def is_shadow(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return (
        v >= MIN_VALUE
        and s >= MIN_SAT
        and r >= MIN_RED
        and b >= MIN_BLUE
        and h * 360 <= 25
    )


def fix_stage(path, m, check=False):
    im = Image.open(path).convert("RGBA")
    px = im.load()
    x0 = int(m["neckL"] - 6)
    x1 = int(m["neckR"] + 6)
    y0 = int(m["neck"] - 3)
    y1 = int(m["collar"] + 4)
    changed = []
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            r, g, b, a = px[x, y]
            if a < 128 or not is_shadow(r, g, b):
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            s2 = TARGET_SAT + max(0.0, s - TARGET_SAT) * KEEP_WARMTH
            r2, g2, b2 = colorsys.hsv_to_rgb(h, s2, v)
            new = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
            changed.append(((x, y), (r, g, b), new[:3]))
            if not check:
                px[x, y] = new
    return im, changed, (x0, y0, x1, y1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="只報告，不改檔")
    ap.add_argument("--diff-bbox", action="store_true", help="改完印出與原圖差異範圍")
    args = ap.parse_args()

    metrics = stage_metrics()
    total = 0
    for g in range(4, 10):
        stage = f"g{g}"
        path = AV / f"base_{stage}.png"
        before = Image.open(path).convert("RGBA")
        im, changed, rect = fix_stage(path, metrics[stage], check=args.check)
        total += len(changed)
        sample = changed[:3]
        print(
            f"{path.name}: 動到 {len(changed):3d} 像素  區域 x{rect[0]}..{rect[2]} y{rect[1]}..{rect[3]}"
        )
        for (xy, old, new) in sample:
            print(f"    {xy} {old} → {new}")
        if not args.check and changed:
            im.save(path)
            if args.diff_bbox:
                diff = [
                    (x, y)
                    for y in range(before.height)
                    for x in range(before.width)
                    if before.getpixel((x, y)) != im.getpixel((x, y))
                ]
                xs = [p[0] for p in diff]
                ys = [p[1] for p in diff]
                print(f"    差異範圍 x{min(xs)}..{max(xs)} y{min(ys)}..{max(ys)}（共 {len(diff)} 點）")
    print(f"合計 {total} 像素{'（未寫檔）' if args.check else ''}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
