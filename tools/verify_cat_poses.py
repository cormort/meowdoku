#!/usr/bin/env python3
"""驗證新姿勢立繪：尺寸、去背品質，並產出品種對照表（contact sheet）。"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parent.parent
ROOM = REPO / "icons" / "room"
BREEDS = ["cat", "orange", "black", "calico"]
POSES = ["idle", "walk", "run", "jump", "lick", "wash", "stretch", "tail", "yawn", "scratch", "eat", "pet", "play", "sleep"]
NEW = ["walk", "run", "jump", "lick", "wash", "stretch", "tail", "yawn", "scratch", "eat"]


def check():
    problems = []
    for breed in BREEDS:
        base = Image.open(ROOM / f"{breed}_idle.png")
        print(f"\n== {breed} (idle base {base.width}x{base.height}) ==")
        for pose in POSES:
            p = ROOM / f"{breed}_{pose}.png"
            if not p.exists():
                problems.append(f"missing {p.name}")
                print(f"  {pose:8s} MISSING")
                continue
            im = Image.open(p).convert("RGBA")
            a = np.array(im)[:, :, 3]
            w, h = im.size
            corners = [int(a[0, 0]), int(a[0, -1]), int(a[-1, 0]), int(a[-1, -1])]
            opaque = (a > 249).mean()
            holes = ((a < 10).mean())
            flag = ""
            if any(c > 0 for c in corners):
                flag += " CORNER-NOT-TRANSPARENT"
                problems.append(f"{p.name}: corner alpha {corners}")
            if holes > 0.8:
                flag += " MOSTLY-EMPTY"
                problems.append(f"{p.name}: transparent {holes:.0%}")
            if pose in NEW and h == base.height and w > 430:
                flag += " WIDTH-CAPPED"
            print(f"  {pose:8s} {w:>4}x{h:<4} 不透明 {opaque:5.1%}{flag}")
    return problems


def sheet(name, poses, out, cell_h=230):
    cols = len(poses)
    rows = len(BREEDS)
    pad, label_h = 8, 22
    ims = {}
    maxw = 0
    for breed in BREEDS:
        for pose in poses:
            im = Image.open(ROOM / f"{breed}_{pose}.png").convert("RGBA")
            k = cell_h / im.height
            im = im.resize((max(1, round(im.width * k)), cell_h), Image.LANCZOS)
            ims[(breed, pose)] = im
            maxw = max(maxw, im.width)
    cw = maxw + pad * 2
    canvas = Image.new("RGB", (cols * cw, rows * (cell_h + label_h + pad) + pad), (255, 255, 255))
    d = ImageDraw.Draw(canvas)
    for r, breed in enumerate(BREEDS):
        y = pad + r * (cell_h + label_h + pad)
        d.text((6, y + 4), breed, fill=(180, 20, 20))
        for c, pose in enumerate(poses):
            im = ims[(breed, pose)]
            x = c * cw + (cw - im.width) // 2
            canvas.paste(im, (x, y + label_h), im)
            d.text((c * cw + 6, y), pose, fill=(40, 40, 40))
    canvas.save(out, quality=92)
    print(f"\n對照表：{out}  ({canvas.width}x{canvas.height})")


if __name__ == "__main__":
    probs = check()
    sheet("新增動作", NEW, REPO / "sheet_new_poses.png")
    sheet("全部姿勢", POSES, REPO / "sheet_all_poses.png")
    print("\n問題：", "無" if not probs else "")
    for p in probs:
        print("  -", p)
    sys.exit(1 if probs else 0)
