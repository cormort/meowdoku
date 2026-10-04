#!/usr/bin/env python3
"""avatar_redraw.py — 重畫髮型／配件的前後處理（搭配 tools/gen_avatar_redraw.js）

作法：不再畫「物件圖板」再猜位置，而是讓 AI 直接在四年級身體上畫，
畫完用顏色把新畫的東西摳出來，位置天生就對齊 base_g4。
- 參考圖：base_g4（穿淡藍上衣）鋪滿純綠底。綠底、膚色、藍衣服都有彩度，
  AI 畫的頭髮／配件規定是白／灰（遊戲裡再上色），所以「沒有彩度」的像素就是新畫的東西。
  配件的參考圖另外戴一頂棕色妹妹頭（有彩度，不會被摳走），耳機、眼鏡才會戴在頭髮外面。
- 眼睛、線稿也沒彩度：跟參考圖比，和參考圖幾乎一樣的就不算。
- AI 輸出的大小、位置可能略有不同：比對綠底／皮膚／藍上衣的色塊自動找縮放與平移對回去。
  帽子的參考圖也戴同一頂棕色妹妹頭，帽子會戴在頭髮上。
- 背包拆兩層：壓在身體上的（背帶）→ acc_backpack_front（疊在上衣前面），其餘 → acc_backpack（身體後面）。

用法（kind 是 hair、acc 或 hat）：
  python3 tools/avatar_redraw.py ref <kind>                  # 產生 /tmp/avatar_ref/<kind>.png
  （跑 tools/gen_avatar_redraw.js，輸出 /tmp/avatar_gen/<kind>/<id>.png）
  python3 tools/avatar_redraw.py process <kind> [id ...]     # 摳圖 → icons/avatar/（頭髮另外產生後髮）
  python3 tools/avatar_redraw.py process <kind> --preview    # 只輸出到 /tmp/avatar_gen/<kind>/out 並出預覽圖
  python3 tools/avatar_redraw.py split-backpack              # 把現有的 acc_backpack.png 拆成前後兩層
需要 Pillow、numpy；process hair 最後會呼叫 node tools/split_avatar_hair.mjs --fresh。
"""
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
AV = ROOT / "icons" / "avatar"
W = H = 512
SIDE = 1024  # 參考圖邊長
GREEN = (0, 177, 64)
SHIRT = (156, 195, 230)  # 淡藍上衣，讓衣服有彩度、不會被當成頭髮／配件
HAIR_REF = (138, 90, 52)  # 配件、帽子參考圖的棕色頭髮
PANTS = (74, 111, 165)  # 配件、帽子參考圖的深藍短褲（不穿褲子 AI 可能自己補畫）
SAT_MAX = 30  # 彩度（RGB 最大減最小）低於這個算「白／灰」＝新畫的東西；AI 畫得偏米色時可以調高
# 參考圖從 512 畫布（g4 座標）裁哪一塊（正方形 x0, y0, x1, y1）
KINDS = {
    "hair": {"crop": (106, 20, 406, 320), "prefix": "hair_"},  # 頭＋肩，留空間給長髮
    "acc": {"crop": (56, 20, 456, 420), "prefix": "acc_"},  # 頭到腰，背包、名牌、圍巾都在框內
    "hat": {"crop": (96, 0, 416, 320), "prefix": "hat_"},  # 頭往上留空間給帽冠、兩側給寬帽簷
    "shoes": {"crop": (156, 292, 376, 512), "prefix": "shoes_"},  # 膝下到腳底（鞋子要穿在腳上，不能用「物件圖」猜位置）
}
WITH_HAIR = {"acc", "hat"}  # 參考圖戴棕色妹妹頭的類別（配件、帽子要戴在頭髮外面）
# 和 js/avatar.js 的 ACC_COLOR 一致（預覽用）
HAT_COLOR = {"cap": (224, 87, 79), "beanie": (127, 176, 216), "straw": (232, 201, 122), "beret": (176, 127, 192), "bow": (239, 127, 168)}  # 和 AVATAR_PARTS.hat 一致
ACC_COLOR = {"glasses": (51, 51, 51), "scarf": (224, 87, 79), "backpack": (138, 90, 52), "headphone": (58, 58, 58), "badge": (201, 162, 39)}
# 和 js/avatar.js 的 AVATAR_PARTS.shoes 一致（預覽用）
SHOES_COLOR = {"sneaker": (240, 240, 240), "boots": (107, 74, 53), "loafer": (63, 58, 54), "sandal": (201, 138, 91), "rainboot": (242, 199, 68)}
NECK_LINE = 200  # 背包：這條線以下、壓在身體上的才算背帶（頭後面的仍在身體後面）


def ref_path(kind):
    return Path(f"/tmp/avatar_ref/{kind}.png")


def gen_dir(kind):
    return Path(f"/tmp/avatar_gen/{kind}")


def tinted(file, color):
    im = Image.open(file).convert("RGBA")
    t = Image.fromarray((np.asarray(im.convert("RGB"), np.float32) * np.asarray(color, np.float32) / 255).astype(np.uint8)).convert("RGBA")
    t.putalpha(im.getchannel("A"))
    return t


def scene(kind, hair_color=HAIR_REF):
    """參考場景（512 畫布）：身體 → 上衣 → 頭和脖子（疊在領口前面，跟遊戲一樣）；配件、帽子版再加短褲、棕色妹妹頭"""
    base = Image.open(AV / "base_g4.png").convert("RGBA")
    canvas = Image.new("RGBA", (W, H), GREEN + (255,))
    hair = kind in WITH_HAIR
    if hair:
        canvas.alpha_composite(tinted(AV / "hairback_bob.png", hair_color))
    canvas.alpha_composite(base)
    if hair:
        canvas.alpha_composite(tinted(AV / "bottom_shorts.png", PANTS))
    canvas.alpha_composite(tinted(AV / "top_tshirt.png", SHIRT))
    head = base.copy()
    mask = np.zeros((H, W), np.uint8)
    mask[: 207 + 12] = 255  # 脖子以上
    head.putalpha(Image.fromarray(np.minimum(np.asarray(head.getchannel("A")), mask)))
    canvas.alpha_composite(head)
    if hair:
        canvas.alpha_composite(tinted(AV / "hair_bob.png", hair_color))
    return canvas


def build_ref(kind):
    crop = KINDS[kind]["crop"]
    ref = scene(kind).crop(crop).resize((SIDE, SIDE), Image.LANCZOS).convert("RGB")
    path = ref_path(kind)
    path.parent.mkdir(parents=True, exist_ok=True)
    ref.save(path)
    print(f"參考圖 {path}（{SIDE}x{SIDE}）")


def classes(img, n, brown=False):
    """縮成 n x n 後分類：1 綠底、2 皮膚、3 藍上衣／短褲、4 棕髮（配件參考圖）、0 其他（白灰的新東西、線稿 → 對位時不算）"""
    a = np.asarray(img.resize((n, n), Image.BILINEAR), np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    out = np.zeros((n, n), np.int8)
    out[(g - np.maximum(r, b)) > 40] = 1
    out[(r > 170) & (r - b > 25) & (r >= g) & (g >= b - 10)] = 2
    out[(b > r + 30) & (b > 150) & (g > r)] = 3
    if brown:  # 只有配件參考圖有棕髮；髮型參考圖不分這類，免得皮膚陰影被誤判
        out[(r < 170) & (r > g) & (g > b) & (r - b > 50)] = 4
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


def register(gen, ref, brown=False):
    """找出 gen → ref 的縮放 s 與平移 (dx, dy)（ref 像素座標 p 對到 gen 的 (p - c) * s + c + d）。
    比的是綠底／皮膚／藍上衣／棕髮這幾種顏色區塊，新畫的白灰東西和線稿不算，所以頭髮蓋住臉不影響對位。
    先在 64x64 粗找，再到 256、512 細修。"""
    n = 64
    _, s, dx, dy = _best(classes(gen, n, brown), classes(ref, n, brown), np.arange(0.80, 1.21, 0.02), (range(-12, 13), range(-12, 13)))
    n2 = 256
    k = n2 / n
    score, s, dx, dy = _best(
        classes(gen, n2, brown), classes(ref, n2, brown), np.arange(s - 0.02, s + 0.021, 0.005),
        (np.arange(dx * k - 4, dx * k + 5), np.arange(dy * k - 4, dy * k + 5)),
    )
    n3 = 512
    score, s, dx, dy = _best(
        classes(gen, n3, brown), classes(ref, n3, brown), np.arange(s - 0.006, s + 0.0061, 0.003),
        (np.arange(dx * 2 - 2, dx * 2 + 3), np.arange(dy * 2 - 2, dy * 2 + 3)),
    )
    print(f"  對位吻合 {score[0]:.1%}")
    return s, dx * SIDE / n3, dy * SIDE / n3


def warp(gen, s, dx, dy):
    """把 gen 轉回 ref 座標（SIDE x SIDE）"""
    c = SIDE / 2
    # PIL 的 affine 是 output → input：x_in = a*x + b*y + c0
    return gen.transform((SIDE, SIDE), Image.AFFINE, (s, 0, c - c * s + dx, 0, s, c - c * s + dy), resample=Image.BICUBIC, fillcolor=GREEN)


def enclosed_holes(keep):
    """回傳被 keep 完全包圍的封閉區域（從邊界連不到的空白）。
    背帶這種「白底＋深灰外框」的東西，外框會被摳出來、裡面鏤空，
    看起來就只剩兩條線；把封閉區域補起來才會是實心的。"""
    from collections import deque
    h, w = keep.shape
    outside = np.zeros_like(keep)
    q = deque()
    for y in range(h):
        for x in (0, w - 1):
            if not keep[y, x] and not outside[y, x]:
                outside[y, x] = True
                q.append((y, x))
    for x in range(w):
        for y in (0, h - 1):
            if not keep[y, x] and not outside[y, x]:
                outside[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and not keep[ny, nx] and not outside[ny, nx]:
                outside[ny, nx] = True
                q.append((ny, nx))
    return ~keep & ~outside


def morph_close(mask, r):
    """方形結構元素的膨脹再侵蝕：補掉背帶中間被上衣顏色吃掉的破洞。
    AI 畫的背帶在壓到藍上衣的地方會吃進一點藍（彩度超過門檻）→ 摳圖時中間被挖空，
    看起來像兩條斷掉的線；先膨脹再侵蝕可以把這種窄破洞接起來。"""
    m = mask.copy()
    for _ in range(r):
        d = m.copy()
        d[1:, :] |= m[:-1, :]
        d[:-1, :] |= m[1:, :]
        d[:, 1:] |= m[:, :-1]
        d[:, :-1] |= m[:, 1:]
        m = d
    for _ in range(r):
        e = m.copy()
        e[1:, :] &= m[:-1, :]
        e[:-1, :] &= m[1:, :]
        e[:, 1:] &= m[:, :-1]
        e[:, :-1] &= m[:, 1:]
        m = e
    return m


def extract(gen, ref, crop, fill_holes=False):
    a = np.asarray(gen, np.int16)
    rf = np.asarray(ref, np.int16)
    sat = a.max(-1) - a.min(-1)
    green = (a[..., 1] - np.maximum(a[..., 0], a[..., 2])) > 40
    neutral = (sat < SAT_MAX) & ~green
    same = np.abs(a - rf).max(-1) < 40
    ref_neutral = (rf.max(-1) - rf.min(-1)) < SAT_MAX
    # 只扣除五官特徵區（眉毛、眼睛、嘴巴）；頭部與臉頰外輪廓不應扣除，否則會在頭髮內留下頭殼虛線切痕
    y_idx, x_idx = np.indices(neutral.shape)
    is_face_feature = (y_idx >= 280) & (y_idx <= 520) & (x_idx >= 370) & (x_idx <= 650)
    hair = neutral & ~(same & ref_neutral & is_face_feature)
    # 只留夠大的塊（最大塊的 2% 以上；眼睛、雜點會掉）
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
    if fill_holes:
        keep = morph_close(keep, 6)
        keep = keep | enclosed_holes(keep)
    lum = (a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11).clip(0, 255).astype(np.uint8)
    alpha = Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    out = Image.merge("RGBA", (Image.fromarray(lum),) * 3 + (alpha,))
    # 縮回 512 畫布（g4 座標）
    size = crop[2] - crop[0]
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    canvas.alpha_composite(out.resize((size, size), Image.LANCZOS), (crop[0], crop[1]))
    return canvas


def split_backpack(img):
    """背包拆前後：NECK_LINE 以下、壓在身體或上衣上的像素 → 前（背帶），其餘 → 後"""
    body = np.asarray(Image.open(AV / "base_g4.png").getchannel("A")) > 128
    body |= np.asarray(Image.open(AV / "top_tshirt.png").getchannel("A")) > 128
    body[:NECK_LINE] = False
    a = np.asarray(img.getchannel("A"))
    front, back = img.copy(), img.copy()
    front.putalpha(Image.fromarray(np.where(body, a, 0).astype(np.uint8)))
    back.putalpha(Image.fromarray(np.where(body, 0, a).astype(np.uint8)))
    return front, back


def save_acc(aid, img, out_dir):
    if aid == "backpack":
        front, back = split_backpack(img)
        back.save(out_dir / "acc_backpack.png")
        front.save(out_dir / "acc_backpack_front.png")
    else:
        img.save(out_dir / f"acc_{aid}.png")


def preview(kind, ids, out_dir):
    crop = KINDS[kind]["crop"]
    size = 300
    if kind == "hair":
        colors = [(58, 47, 42), (138, 90, 52), (232, 138, 168)]
        sheet = Image.new("RGB", (size * len(ids), size * len(colors)))
        base = Image.open(AV / "base_g4.png").convert("RGBA")
        for i, hid in enumerate(ids):
            for j, col in enumerate(colors):
                c = Image.new("RGBA", (W, H), (122, 156, 198, 255))
                c.alpha_composite(tinted(out_dir / f"hairback_{hid}.png", col))
                c.alpha_composite(base)
                c.alpha_composite(tinted(out_dir / f"hair_{hid}.png", col))
                sheet.paste(c.crop(crop).resize((size, size)).convert("RGB"), (i * size, j * size))
    elif kind == "hat":
        sheet = Image.new("RGB", (size * len(ids), size))
        s = scene("hat")
        green = np.all(np.asarray(s)[..., :3] == GREEN, -1)
        s.putalpha(Image.fromarray(np.where(green, 0, 255).astype(np.uint8)))
        for i, hid in enumerate(ids):
            c = Image.new("RGBA", (W, H), (122, 156, 198, 255))
            c.alpha_composite(s)
            c.alpha_composite(tinted(out_dir / f"hat_{hid}.png", HAT_COLOR.get(hid, (224, 87, 79))))
            sheet.paste(c.crop(crop).resize((size, size)).convert("RGB"), (i * size, 0))
    elif kind == "shoes":
        sheet = Image.new("RGB", (size * len(ids), size))
        s = scene("shoes")
        green = np.all(np.asarray(s)[..., :3] == GREEN, -1)
        s.putalpha(Image.fromarray(np.where(green, 0, 255).astype(np.uint8)))
        for i, sid in enumerate(ids):
            c = Image.new("RGBA", (W, H), (122, 156, 198, 255))
            c.alpha_composite(s)
            c.alpha_composite(tinted(out_dir / f"shoes_{sid}.png", SHOES_COLOR.get(sid, (240, 240, 240))))
            sheet.paste(c.crop(crop).resize((size, size)).convert("RGB"), (i * size, 0))
    else:
        # 配件：照遊戲的疊法（背包後層在最底、背帶在上衣前面、其他配件在最上面）
        sheet = Image.new("RGB", (size * len(ids), size))
        for i, aid in enumerate(ids):
            col = ACC_COLOR.get(aid, (138, 90, 52))
            c = Image.new("RGBA", (W, H), (122, 156, 198, 255))
            if aid == "backpack":
                c.alpha_composite(tinted(out_dir / "acc_backpack.png", col))
            s = scene("acc")
            green = np.all(np.asarray(s)[..., :3] == GREEN, -1)
            s.putalpha(Image.fromarray(np.where(green, 0, 255).astype(np.uint8)))
            c.alpha_composite(s)
            c.alpha_composite(tinted(out_dir / (f"acc_backpack_front.png" if aid == "backpack" else f"acc_{aid}.png"), col))
            sheet.paste(c.crop(crop).resize((size, size)).convert("RGB"), (i * size, 0))
    path = gen_dir(kind) / "preview.png"
    sheet.save(path)
    print(f"預覽 {path}")


def process(kind, args):
    dry = "--preview" in args
    gdir = gen_dir(kind)
    ids = [a for a in args if not a.startswith("--")] or sorted(p.stem for p in gdir.glob("*.png") if p.stem != "preview")
    if not ref_path(kind).exists():
        build_ref(kind)
    ref = Image.open(ref_path(kind)).convert("RGB")
    crop = KINDS[kind]["crop"]
    out_dir = gdir / "out" if dry else AV
    out_dir.mkdir(parents=True, exist_ok=True)
    done = []
    for iid in ids:
        f = gdir / f"{iid}.png"
        if not f.exists():
            print(f"缺 {f}，跳過")
            continue
        gen = Image.open(f).convert("RGB")
        if gen.size != (SIDE, SIDE):
            gen = gen.resize((SIDE, SIDE), Image.LANCZOS)
        s, dx, dy = register(gen, ref, brown=kind in WITH_HAIR)
        img = extract(warp(gen, s, dx, dy), ref, crop, fill_holes=(kind == "acc" and iid == "backpack"))
        if kind == "acc":
            save_acc(iid, img, out_dir)
        else:
            img.save(out_dir / f"{KINDS[kind]['prefix']}{iid}.png")
        n = int((np.asarray(img.getchannel("A")) > 128).sum())
        print(f"{KINDS[kind]['prefix']}{iid}: 縮放 {s:.2f} 平移 ({dx:+.0f}, {dy:+.0f})，{n} px")
        done.append(iid)
    if done and kind == "hair":
        cmd = ["node", str(ROOT / "tools" / "split_avatar_hair.mjs"), "--fresh"] + (["--dir", str(out_dir)] if dry else []) + done
        subprocess.run(cmd, check=True)
    if done:
        preview(kind, done, out_dir)


if __name__ == "__main__":
    cmd, rest = (sys.argv[1], sys.argv[2:]) if len(sys.argv) > 1 else ("", [])
    if cmd in ("ref", "process") and rest and rest[0] in KINDS:
        build_ref(rest[0]) if cmd == "ref" else process(rest[0], rest[1:])
    elif cmd == "split-backpack":
        front, back = split_backpack(Image.open(AV / "acc_backpack.png").convert("RGBA"))
        back.save(AV / "acc_backpack.png")
        front.save(AV / "acc_backpack_front.png")
        print("acc_backpack.png（後）＋ acc_backpack_front.png（背帶）")
    else:
        print(__doc__)
