#!/usr/bin/env python3
"""gen_avatar_layers.py — 產生主角的 PNG 分層素材（icons/avatar/）

設計：所有圖層都是「白色形狀 + alpha」的遮罩 PNG，同一個 260x400 畫布對齊。
瀏覽器端用 CSS mask-image 上色，所以一種形狀只要一張圖，顏色在程式裡決定。
alpha 小於 1 的區域會透出下層，形成簡單的明暗。

用法：python3 tools/gen_avatar_layers.py
"""
import os
from PIL import Image, ImageDraw, ImageFilter

W, H = 260, 400
SS = 4  # 超取樣倍率，畫完再縮小以獲得平滑邊緣
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icons", "avatar")

# 幾何：頭、脖子、身體、手臂、腿
HEAD = (68, 46, 192, 170)
NECK = (116, 158, 144, 192)
TORSO = (86, 182, 174, 302)
ARM_L = (64, 192, 92, 288)
ARM_R = (168, 192, 196, 288)
HAND_L = (78, 268, 108, 298)
HAND_R = (152, 268, 182, 298)
LEG_L = (100, 296, 124, 352)
LEG_R = (136, 296, 160, 352)


def canvas():
    img = Image.new("L", (W * SS, H * SS), 0)
    return img, ImageDraw.Draw(img)


def box(b):
    return tuple(v * SS for v in b)


def rr(d, b, r, alpha=255):
    d.rounded_rectangle(box(b), radius=r * SS, fill=alpha)


def ell(d, b, alpha=255):
    d.ellipse(box(b), fill=alpha)


def poly(d, pts, alpha=255):
    d.polygon([(x * SS, y * SS) for x, y in pts], fill=alpha)


def line(d, pts, w, alpha=255):
    d.line([(x * SS, y * SS) for x, y in pts], fill=alpha, width=int(w * SS), joint="curve")


def save(img, name):
    # 存成「白色 + alpha=遮罩值」的 LA PNG：CSS mask-image 預設看 alpha 通道，
    # 形狀以外必須是 alpha=0，才不會整塊都上色。
    small = img.resize((W, H), Image.LANCZOS).convert("L")
    out = Image.merge("LA", (Image.new("L", small.size, 255), small))
    path = os.path.join(OUT, name + ".png")
    out.save(path, optimize=True)
    return path


def shadow(img):
    """把形狀往內縮一點做成暗部，讓遮罩上色後有立體感。"""
    return img.filter(ImageFilter.GaussianBlur(6 * SS))


# ── 基本身體 ───────────────────────────────────────────────
def base():
    img, d = canvas()
    # 腿
    rr(d, LEG_L, 12)
    rr(d, LEG_R, 12)
    # 手臂
    rr(d, ARM_L, 14)
    rr(d, ARM_R, 14)
    # 手
    ell(d, HAND_L)
    ell(d, HAND_R)
    # 身體（下緣稍微內縮，看起來比較自然）
    rr(d, (86, 182, 174, 302), 20)
    # 脖子
    rr(d, NECK, 10)
    # 耳朵
    ell(d, (58, 104, 80, 138))
    ell(d, (180, 104, 202, 138))
    # 頭
    ell(d, HEAD)
    # 暗部：身體中線與手臂內側，用低 alpha 做出立體感
    dark = Image.new("L", (W * SS, H * SS), 0)
    dd = ImageDraw.Draw(dark)
    rr(dd, (86, 182, 130, 302), 20, 70)          # 身體左側陰影
    rr(dd, (64, 192, 78, 288), 14, 60)           # 左手臂陰影
    rr(dd, (150, 296, 160, 352), 10, 60)         # 右腿陰影
    ell(dd, (68, 46, 192, 96), 45)               # 額頭上方（會被頭髮蓋住）
    img = Image.composite(Image.new("L", img.size, 150), img, dark.point(lambda v: 255 if v > 60 else 0))
    return img


# ── 臉 ─────────────────────────────────────────────────────
def face_eyes():
    """眼睛：上緣較厚的可愛大眼。"""
    img, d = canvas()
    for cx in (100, 160):
        ell(d, (cx - 20, 104, cx + 20, 150))
        ell(d, (cx - 18, 104, cx + 18, 124), 200)
    return img


def face_shine():
    """眼睛反光。"""
    img, d = canvas()
    for cx in (100, 160):
        ell(d, (cx + 2, 108, cx + 14, 120), 235)
        ell(d, (cx - 12, 128, cx - 4, 136), 150)
    return img


def face_mouth():
    img, d = canvas()
    d.arc(box((118, 142, 142, 164)), start=10, end=170, fill=255, width=int(4 * SS))
    return img


def face_blush():
    img, d = canvas()
    for cx in (84, 176):
        ell(d, (cx - 18, 130, cx + 18, 150), 130)
    return img


# ── 頭髮 ───────────────────────────────────────────────────
# 全部都是「帽蓋」：蓋住頭頂與兩側，臉（眼睛 y>=104）一定露出來
def hair_cap(d):
    ell(d, (62, 28, 198, 132))                    # 頭頂
    ell(d, (60, 60, 200, 118))                    # 兩側厚度


def fringe(d, wavy=True):
    # 瀏海：橫跨額頭，下緣到 y=100
    if wavy:
        poly(d, [(70, 96), (64, 56), (196, 56), (190, 96), (168, 88), (140, 94), (112, 88), (88, 94)], 255)
    else:
        poly(d, [(70, 100), (64, 58), (196, 58), (190, 100)], 255)


def hair_short():
    img, d = canvas()
    hair_cap(d)
    fringe(d)
    return img


def hair_bob():
    img, d = canvas()
    hair_cap(d)
    rr(d, (58, 84, 88, 196), 16)                  # 左側長髮
    rr(d, (172, 84, 202, 196), 16)                # 右側長髮
    fringe(d)
    return img


def hair_twin():
    img, d = canvas()
    ell(d, (30, 116, 80, 192))                    # 左髮束
    ell(d, (180, 116, 230, 192))                  # 右髮束
    hair_cap(d)
    fringe(d)
    return img


def hair_pony():
    img, d = canvas()
    poly(d, [(190, 66), (234, 100), (242, 172), (222, 198), (200, 170), (188, 108)], 255)  # 馬尾
    hair_cap(d)
    fringe(d)
    return img


def hair_curly():
    img, d = canvas()
    for cx, cy, r in ((56, 80, 24), (204, 80, 24), (130, 22, 26), (82, 36, 20), (178, 36, 20), (72, 118, 18), (188, 118, 18)):
        ell(d, (cx - r, cy - r, cx + r, cy + r))
    hair_cap(d)
    fringe(d)
    return img


def hair_bowl():
    img, d = canvas()
    ell(d, (60, 30, 200, 128))
    # 平瀏海（西瓜皮）：一整片蓋到眉毛上方
    poly(d, [(62, 100), (60, 56), (200, 56), (198, 100)], 255)
    rr(d, (56, 80, 84, 124), 12)
    rr(d, (176, 80, 204, 124), 12)
    return img


# ── 上衣 ───────────────────────────────────────────────────
def top_tshirt():
    img, d = canvas()
    rr(d, (80, 184, 180, 304), 16)
    rr(d, (58, 190, 96, 246), 16)
    rr(d, (164, 190, 202, 246), 16)
    return img


def top_hoodie():
    img, d = canvas()
    rr(d, (78, 182, 182, 308), 18)
    rr(d, (54, 190, 96, 296), 18)
    rr(d, (164, 190, 206, 296), 18)
    poly(d, [(96, 182), (130, 210), (164, 182), (172, 196), (130, 232), (88, 196)], 255)  # 帽子
    rr(d, (104, 246, 156, 286), 10)  # 口袋
    return img


def top_shirt():
    img, d = canvas()
    rr(d, (80, 184, 180, 304), 14)
    rr(d, (58, 190, 96, 292), 16)
    rr(d, (164, 190, 202, 292), 16)
    poly(d, [(104, 184), (130, 216), (156, 184), (162, 194), (130, 230), (98, 194)], 90)  # 領口
    for y in (232, 252, 272):
        ell(d, (128, y - 3, 134, y + 3), 180)
    return img


def top_sailor():
    img, d = canvas()
    rr(d, (80, 184, 180, 304), 14)
    rr(d, (58, 194, 96, 250), 16)
    rr(d, (164, 194, 202, 250), 16)
    poly(d, [(96, 184), (130, 220), (164, 184), (176, 200), (130, 248), (84, 200)], 255)  # 水手領
    poly(d, [(96, 184), (130, 220), (164, 184), (168, 192), (130, 228), (92, 192)], 0)
    return img


def top_sweater():
    img, d = canvas()
    rr(d, (74, 182, 186, 308), 22)
    rr(d, (50, 190, 96, 300), 20)
    rr(d, (164, 190, 210, 300), 20)
    for y in range(196, 300, 14):
        line(d, [(80, y), (180, y)], 1.5, 70)
    return img


def top_vest():
    img, d = canvas()
    rr(d, (84, 184, 176, 306), 16)
    poly(d, [(84, 198), (104, 184), (156, 184), (176, 198), (176, 232), (84, 232)], 255)  # 肩線
    line(d, [(130, 186), (130, 304)], 2, 0)
    ell(d, (126, 216, 134, 226), 0)
    return img


# ── 褲／裙 ─────────────────────────────────────────────────
def bottom_jeans():
    img, d = canvas()
    rr(d, (84, 288, 176, 322), 10)
    rr(d, (94, 310, 126, 356), 10)
    rr(d, (134, 310, 166, 356), 10)
    line(d, [(130, 300), (130, 320)], 2, 0)
    return img


def bottom_shorts():
    img, d = canvas()
    rr(d, (84, 288, 176, 324), 10)
    rr(d, (94, 310, 126, 332), 10)
    rr(d, (134, 310, 166, 332), 10)
    line(d, [(130, 300), (130, 318)], 2, 0)
    return img


def bottom_skirt():
    img, d = canvas()
    poly(d, [(86, 288), (174, 288), (196, 348), (64, 348)], 255)
    rr(d, (86, 286, 174, 300), 8)
    for x in (100, 112, 124, 136, 148, 160):
        line(d, [(x, 300), (x - 6 + (x - 130) * 0.15, 346)], 1.5, 60)
    return img


def bottom_pleat():
    img, d = canvas()
    poly(d, [(84, 288), (176, 288), (204, 382), (56, 382)], 255)
    rr(d, (84, 286, 176, 302), 8)
    for x in range(92, 172, 10):
        line(d, [(x, 302), (x - 24 + (x - 130) * 0.4, 380)], 1.5, 55)
    return img


def bottom_sport():
    img, d = canvas()
    rr(d, (84, 288, 176, 322), 12)
    rr(d, (92, 310, 126, 358), 12)
    rr(d, (134, 310, 166, 358), 12)
    line(d, [(94, 296), (166, 296)], 3, 120)
    return img


# ── 鞋子 ───────────────────────────────────────────────────
def shoes_sneaker():
    img, d = canvas()
    rr(d, (90, 344, 128, 372), 12)
    rr(d, (132, 344, 170, 372), 12)
    rr(d, (90, 364, 128, 374), 6, 150)
    rr(d, (132, 364, 170, 374), 6, 150)
    return img


def shoes_boots():
    img, d = canvas()
    rr(d, (90, 330, 128, 374), 8)
    rr(d, (132, 330, 170, 374), 8)
    line(d, [(90, 344), (128, 344)], 3, 120)
    line(d, [(132, 344), (170, 344)], 3, 120)
    return img


def shoes_loafer():
    img, d = canvas()
    rr(d, (90, 352, 128, 372), 8)
    rr(d, (132, 352, 170, 372), 8)
    poly(d, [(98, 352), (120, 352), (116, 358), (98, 358)], 120)
    poly(d, [(140, 352), (162, 352), (158, 358), (140, 358)], 120)
    return img


def shoes_sandal():
    img, d = canvas()
    rr(d, (90, 362, 128, 374), 6)
    rr(d, (132, 362, 170, 374), 6)
    for x in (96, 108, 120):
        rr(d, (x, 344, x + 8, 366), 3)
    for x in (138, 150, 162):
        rr(d, (x, 344, x + 8, 366), 3)
    return img


def shoes_rainboot():
    img, d = canvas()
    rr(d, (88, 326, 130, 376), 8)
    rr(d, (130, 326, 172, 376), 8)
    line(d, [(88, 342), (130, 342)], 4, 140)
    line(d, [(130, 342), (172, 342)], 4, 140)
    return img


# ── 帽子 ───────────────────────────────────────────────────
def hat_cap():
    img, d = canvas()
    ell(d, (66, 30, 194, 132))
    poly(d, [(66, 96), (194, 96), (194, 116), (66, 116)], 255)
    rr(d, (150, 96, 226, 118), 10)  # 帽簷
    return img


def hat_beanie():
    img, d = canvas()
    ell(d, (62, 26, 198, 130))
    rr(d, (58, 100, 202, 126), 12, 235)
    ell(d, (120, 14, 140, 34), 235)
    return img


def hat_straw():
    img, d = canvas()
    ell(d, (30, 96, 230, 132))
    ell(d, (68, 24, 192, 118))
    line(d, [(70, 100), (190, 100)], 5, 90)
    return img


def hat_beret():
    img, d = canvas()
    ell(d, (66, 30, 194, 104))
    poly(d, [(66, 78), (194, 78), (196, 100), (64, 100)], 235)
    ell(d, (176, 20, 198, 42), 235)
    return img


def hat_bow():
    img, d = canvas()
    poly(d, [(122, 52), (74, 26), (74, 88)], 255)
    poly(d, [(138, 52), (186, 26), (186, 88)], 255)
    ell(d, (118, 40, 142, 64), 255)
    return img


# ── 配件 ───────────────────────────────────────────────────
def acc_glasses():
    img, d = canvas()
    d.ellipse(box((80, 96, 120, 134)), outline=255, width=int(5 * SS))
    d.ellipse(box((140, 96, 180, 134)), outline=255, width=int(5 * SS))
    line(d, [(120, 112), (140, 112)], 5)
    line(d, [(80, 108), (68, 104)], 4)
    line(d, [(180, 108), (192, 104)], 4)
    return img


def acc_scarf():
    img, d = canvas()
    rr(d, (88, 176, 172, 208), 12)
    poly(d, [(150, 200), (176, 200), (184, 262), (158, 254)], 255)
    return img


def acc_backpack():
    img, d = canvas()
    rr(d, (60, 196, 200, 300), 22, 235)
    rr(d, (100, 210, 160, 254), 12, 200)
    line(d, [(118, 196), (118, 232)], 4, 200)
    line(d, [(142, 196), (142, 232)], 4, 200)
    return img


def acc_headphone():
    img, d = canvas()
    d.arc(box((62, 40, 198, 150)), start=180, end=360, fill=255, width=int(8 * SS))
    rr(d, (52, 92, 76, 142), 12, 255)
    rr(d, (184, 92, 208, 142), 12, 255)
    return img


def acc_badge():
    img, d = canvas()
    rr(d, (104, 226, 156, 254), 6)
    line(d, [(112, 236), (148, 236)], 2, 0)
    line(d, [(112, 244), (136, 244)], 2, 0)
    return img


LAYERS = {
    "base": base,
    "face_eyes": face_eyes,
    "face_shine": face_shine,
    "face_mouth": face_mouth,
    "face_blush": face_blush,
    "hair_short": hair_short,
    "hair_bob": hair_bob,
    "hair_twin": hair_twin,
    "hair_pony": hair_pony,
    "hair_curly": hair_curly,
    "hair_bowl": hair_bowl,
    "top_tshirt": top_tshirt,
    "top_hoodie": top_hoodie,
    "top_shirt": top_shirt,
    "top_sailor": top_sailor,
    "top_sweater": top_sweater,
    "top_vest": top_vest,
    "bottom_jeans": bottom_jeans,
    "bottom_shorts": bottom_shorts,
    "bottom_skirt": bottom_skirt,
    "bottom_pleat": bottom_pleat,
    "bottom_sport": bottom_sport,
    "shoes_sneaker": shoes_sneaker,
    "shoes_boots": shoes_boots,
    "shoes_loafer": shoes_loafer,
    "shoes_sandal": shoes_sandal,
    "shoes_rainboot": shoes_rainboot,
    "hat_cap": hat_cap,
    "hat_beanie": hat_beanie,
    "hat_straw": hat_straw,
    "hat_beret": hat_beret,
    "hat_bow": hat_bow,
    "acc_glasses": acc_glasses,
    "acc_scarf": acc_scarf,
    "acc_backpack": acc_backpack,
    "acc_headphone": acc_headphone,
    "acc_badge": acc_badge,
}


def main():
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for name, fn in LAYERS.items():
        save(fn(), name)
        total += 1
    print(f"產生 {total} 張圖層到 {OUT}")


if __name__ == "__main__":
    main()
