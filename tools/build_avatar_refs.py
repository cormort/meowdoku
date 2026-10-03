#!/usr/bin/env python3
"""build_avatar_refs.py — 產生給 Nano Banana 參考用的圖板

把目前的遮罩圖層依分類排成格狀（白底、每格等大、每格中央），
讓 AI 依同樣的版型重繪，之後再切格、對齊回 260x400 的圖層。
輸出到 /tmp/avatar_ref/（不進 repo）。
"""
import os
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "icons" / "avatar"
OUT = Path("/tmp/avatar_ref")
CELL = 320          # 每格邊長（含邊距）
PAD = 24
BG = (255, 255, 255, 255)

GROUPS = {
    "base": ["base", "face_blush", "face_eyes", "face_shine", "face_mouth"],
    "hair": ["hair_short", "hair_bob", "hair_twin", "hair_pony", "hair_curly", "hair_bowl"],
    "tops": ["top_tshirt", "top_hoodie", "top_shirt", "top_sailor", "top_sweater", "top_vest"],
    "bottoms": ["bottom_jeans", "bottom_shorts", "bottom_skirt", "bottom_pleat", "bottom_sport"],
    "shoes": ["shoes_sneaker", "shoes_boots", "shoes_loafer", "shoes_sandal", "shoes_rainboot"],
    "hats": ["hat_cap", "hat_beanie", "hat_straw", "hat_beret", "hat_bow"],
    "accessories": ["acc_glasses", "acc_scarf", "acc_backpack", "acc_headphone", "acc_badge"],
}
# 每格上色（給 AI 參考的顏色，重繪時也會沿用這個色系）
TINT = {
    "base": (255, 225, 201), "face_blush": (241, 154, 154), "face_eyes": (43, 43, 43),
    "face_shine": (255, 255, 255), "face_mouth": (179, 96, 79),
    "hair_short": (58, 47, 42), "hair_bob": (138, 90, 52), "hair_twin": (224, 180, 92),
    "hair_pony": (232, 138, 168), "hair_curly": (93, 134, 216), "hair_bowl": (92, 201, 167),
    "top_tshirt": (255, 255, 255), "top_hoodie": (111, 168, 220), "top_shirt": (219, 231, 245),
    "top_sailor": (244, 247, 251), "top_sweater": (242, 184, 128), "top_vest": (168, 213, 162),
    "bottom_jeans": (74, 111, 165), "bottom_shorts": (122, 92, 70), "bottom_skirt": (212, 106, 138),
    "bottom_pleat": (140, 107, 177), "bottom_sport": (79, 107, 82),
    "shoes_sneaker": (240, 240, 240), "shoes_boots": (107, 74, 53), "shoes_loafer": (63, 58, 54),
    "shoes_sandal": (201, 138, 91), "shoes_rainboot": (242, 199, 68),
    "hat_cap": (224, 87, 79), "hat_beanie": (127, 176, 216), "hat_straw": (232, 201, 122),
    "hat_beret": (176, 127, 192), "hat_bow": (239, 127, 168),
    "acc_glasses": (51, 51, 51), "acc_scarf": (224, 87, 79), "acc_backpack": (138, 90, 52),
    "acc_headphone": (58, 58, 58), "acc_badge": (201, 162, 39),
}


def tinted(name):
    m = Image.open(SRC / f"{name}.png").convert("L")
    im = Image.new("RGBA", m.size, TINT[name] + (0,))
    im.putalpha(m)
    return im


def fit(im, box):
    r = min(box[0] / im.width, box[1] / im.height)
    return im.resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.LANCZOS)


def sheet(names, cols, path, stack_all=False):
    rows = (len(names) + cols - 1) // cols
    rows = max(rows, 3)  # 一律補成 3x3 正方形，配合 AI 的 1:1 輸出
    W, H = CELL * cols, CELL * rows
    canvas = Image.new("RGBA", (W, H), BG)
    for i, n in enumerate(names):
        cx, cy = (i % cols) * CELL, (i // cols) * CELL
        if stack_all:
            # base：把五張臉部圖層疊在同一格
            cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
            for m in GROUPS["base"]:
                piece = fit(tinted(m), (CELL - PAD * 2, CELL - PAD * 2))
                cell.alpha_composite(piece, ((CELL - piece.width) // 2, (CELL - piece.height) // 2))
            canvas.alpha_composite(cell, (cx, cy))
        else:
            piece = fit(tinted(n), (CELL - PAD * 2, CELL - PAD * 2))
            canvas.alpha_composite(piece, (cx + (CELL - piece.width) // 2, cy + (CELL - piece.height) // 2))
    canvas.convert("RGB").save(path)
    print(f"{path.name}: {W}x{H} ({cols}x{rows})")
    return path


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sheet(["base"], 1, OUT / "ref_base.png", stack_all=True)  # 五張臉部圖層疊成一格
    sheet(GROUPS["hair"], 3, OUT / "ref_hair.png")
    sheet(GROUPS["tops"], 3, OUT / "ref_tops.png")
    sheet(GROUPS["bottoms"], 3, OUT / "ref_bottoms.png")
    sheet(GROUPS["shoes"], 3, OUT / "ref_shoes.png")
    sheet(GROUPS["hats"], 3, OUT / "ref_hats.png")
    sheet(GROUPS["accessories"], 3, OUT / "ref_accessories.png")


if __name__ == "__main__":
    main()
