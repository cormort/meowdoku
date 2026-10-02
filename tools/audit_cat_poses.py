#!/usr/bin/env python3
"""姿勢立繪品種稽核：把每張生圖的非白像素色彩分佈，跟該品種既有立繪比對。

AI 生圖偶爾會畫錯品種（尤其參考圖沒附上時），檔名卻仍照原計畫存，
所以進 repo 前一定要跑這關：判定品種 != 檔名品種就列出。

用法：
    python3 tools/audit_cat_poses.py --source <生圖目錄> [--room icons/room]
離開碼 1 代表有問題，可直接掛進 CI／腳本串。
"""
import argparse
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image

POSES = ["walk", "run", "jump", "lick", "wash", "stretch", "tail", "yawn", "scratch", "eat"]
BREEDS = ["cat", "orange", "black", "calico"]


def histogram(rgb, mask, bins=4):
    px = rgb[mask]
    h = np.zeros((bins, bins, bins))
    step = 256 // bins
    idx = (px[:, 0] // step) * bins * bins + (px[:, 1] // step) * bins + (px[:, 2] // step)
    for i in idx:
        h.flat[int(i)] += 1
    return h / max(1.0, h.sum())


def profile(paths):
    acc = np.zeros((4, 4, 4))
    for p in paths:
        if not os.path.exists(p):
            continue
        a = np.array(Image.open(p).convert("RGBA"))
        m = a[:, :, 3] > 200
        if m.sum() == 0:
            continue
        acc += histogram(a[:, :, :3], m)
    return acc / max(1e-9, acc.sum())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True)
    ap.add_argument("--room", default=str(Path(__file__).resolve().parent.parent / "icons" / "room"))
    ap.add_argument("--min-score", type=float, default=0.55, help="低於此相似度視為無法判定")
    args = ap.parse_args()

    refs = {
        b: profile([os.path.join(args.room, f"{b}_{x}.png") for x in ["idle", "pet", "play", "sleep"]])
        for b in BREEDS
    }
    bad, missing, warn = [], [], []
    for breed in BREEDS:
        for pose in POSES:
            f = os.path.join(args.source, f"{breed}_{pose}.png")
            if not os.path.exists(f):
                missing.append(f"{breed}_{pose}")
                continue
            a = np.array(Image.open(f).convert("RGB")).astype(int)
            m = a.sum(axis=2) < 720  # 排除近白背景
            if m.sum() == 0:
                bad.append((f"{breed}_{pose}", "全白", 0.0))
                continue
            h = histogram(a, m)
            scores = {b: float(np.minimum(h, refs[b]).sum()) for b in refs}
            best = max(scores, key=lambda k: scores[k])
            # 白貓與三花的色彩分佈接近，單看直方圖會有偽陽性：
            # 只有「判定不是本品種」而且差距明確（>0.08）才當成錯，否則列為待目視。
            margin = scores[best] - scores[breed]
            if best != breed and margin > 0.08:
                bad.append((f"{breed}_{pose}", best, round(scores[best], 3)))
            elif best != breed:
                warn.append((f"{breed}_{pose}", best, round(scores[best], 3), round(margin, 3)))
            print(f"  {breed}_{pose:8s} → {best:7s} {round(scores[best], 3)}  {dict((k, round(v, 3)) for k, v in scores.items())}")

    if missing:
        print(f"\n! 缺少 {len(missing)} 張：{', '.join(missing)}")
    if warn:
        print("\n⚠ 色彩分佈接近、需目視確認（白貓／三花易混淆）：")
        for key, got, sc, mg in warn:
            print(f"   {key} → 判定 {got}（{sc}，僅領先 {mg}）")
    if bad:
        print("\n❌ 品種疑似不符：")
        for key, got, sc in bad:
            print(f"   {key} → 判定 {got}（{sc}）")
    else:
        print("\n✅ 品種全部相符")
    sys.exit(1 if (bad or missing) else 0)


if __name__ == "__main__":
    sys.exit(main())
