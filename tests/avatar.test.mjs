// tests/avatar.test.mjs — 驗證主角造型的資料與 PNG 分層繪製
// 用法：node tests/avatar.test.mjs
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AVATAR_PARTS, avatarLabel, avatarLayerUrl, avatarLayers, defaultAvatar, normalizeAvatar, randomAvatar, renderAvatar } from "../js/avatar.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;
const check = (ok, label) => {
  console.log(`  ${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failures++;
};

console.log("=== 造型資料 ===");
check(Object.keys(AVATAR_PARTS).length === 8, "有 8 個可換部位（膚色/髮型/髮色/上衣/褲裙/鞋/帽/配件）");
check(
  AVATAR_PARTS.hair.length >= 5 && AVATAR_PARTS.top.length >= 5 && AVATAR_PARTS.hat.length >= 5,
  "髮型、上衣、帽子都有 5 種以上可選",
);
check(AVATAR_PARTS.hat.some((o) => o.id === "none") && AVATAR_PARTS.accessory.some((o) => o.id === "none"), "帽子和配件可以不戴");
check(
  ["hairColor", "skin", "top", "bottom", "shoes"].every((k) => AVATAR_PARTS[k].every((o) => /^#[0-9a-f]{6}$/i.test(o.value))),
  "顏色類的部位都是合法色碼",
);

console.log("=== 造型存取 ===");
check(normalizeAvatar(null).hair === defaultAvatar().hair, "沒有造型時用預設值");
check(normalizeAvatar({ hair: "不存在的髮型", top: "hoodie" }).top === "hoodie", "保留合法部位");
check(normalizeAvatar({ hair: "不存在的髮型" }).hair === defaultAvatar().hair, "不合法的部位會被換回預設");
const rnd = randomAvatar(() => 0.5);
check(Object.keys(rnd).length === 8 && normalizeAvatar(rnd).hair === rnd.hair, "隨機造型是合法的");
check(avatarLabel({ ...defaultAvatar(), hat: "cap", accessory: "glasses" }).includes("棒球帽"), "造型描述包含帽子");
check(avatarLabel(defaultAvatar()).includes("牛仔褲"), "造型描述包含褲子");

console.log("=== PNG 圖層 ===");
const files = avatarLayers({ ...defaultAvatar(), top: "sailor", hat: "straw", accessory: "glasses" }).map((l) => l.file);
check(files[0] === "base", "第一層是身體");
check(files.includes("top_sailor") && files.includes("hat_straw") && files.includes("acc_glasses"), "上衣／帽子／配件各自獨立成層");
check(files.includes("bottom_jeans") && files.includes("shoes_sneaker"), "褲子與鞋子也是獨立圖層");
check(files.indexOf("hair_bob") < files.indexOf("face_eyes"), "眼睛畫在頭髮之後（不會被瀏海蓋住）");
check(files.indexOf("face_eyes") < files.indexOf("acc_glasses"), "眼鏡畫在眼睛之後");
check(files.indexOf("top_sailor") > files.indexOf("bottom_jeans") && files.indexOf("top_sailor") > files.indexOf("shoes_sneaker"), "上衣蓋在褲子與鞋子之上");
const withPack = avatarLayers({ ...defaultAvatar(), accessory: "backpack" }).map((l) => l.file);
check(withPack[0] === "acc_backpack", "背包畫在最底層（身體之後方）");
check(!avatarLayers(defaultAvatar()).some((l) => l.file.startsWith("hat_")), "沒戴帽子時不會有帽子圖層");
check(avatarLayers(defaultAvatar())[0].color === "#ffe1c9", "身體圖層帶出膚色");
check(/^#[0-9a-f]{6}$/i.test(avatarLayers({ ...defaultAvatar(), hairColor: "pink" }).find((l) => l.file.startsWith("hair_")).color), "頭髮圖層帶出髮色");

console.log("=== 圖層檔案都在 ===");
const needed = new Set(["base", "face_eyes", "face_shine", "face_mouth", "face_blush"]);
for (const hair of AVATAR_PARTS.hair) needed.add(`hair_${hair.id}`);
for (const t of AVATAR_PARTS.top) needed.add(`top_${t.id}`);
for (const b of AVATAR_PARTS.bottom) needed.add(`bottom_${b.id}`);
for (const sh of AVATAR_PARTS.shoes) needed.add(`shoes_${sh.id}`);
for (const h of AVATAR_PARTS.hat) if (h.id !== "none") needed.add(`hat_${h.id}`);
for (const ac of AVATAR_PARTS.accessory) if (ac.id !== "none") needed.add(`acc_${ac.id}`);
const missing = [...needed].filter((f) => !existsSync(join(ROOT, avatarLayerUrl(f))));
check(missing.length === 0, `每個可選項目都有對應的 PNG（缺 ${missing.length} 張${missing.length ? ": " + missing.join(", ") : ""}）`);
check(needed.size >= 35, `需要的圖層共 ${needed.size} 張`);

console.log("=== 角色輸出 ===");
const html = renderAvatar({ ...defaultAvatar(), top: "sailor", hat: "straw" }, { size: 200 });
check(html.startsWith('<div class="avatar-png"'), "輸出是可縮放的 div 容器");
const count = (html.match(/class="av-layer"/g) || []).length;
check(count === 10, `十個圖層疊起來（身體／腮紅／褲／鞋／上衣／髮／眼／反光／嘴／帽，實際 ${count}）`);
check(renderAvatar({ ...defaultAvatar(), accessory: "glasses" }).includes("acc_glasses.png"), "戴眼鏡會多一層配件圖層");
check(html.includes("--av-w:200px"), "可以指定尺寸");
check(html.includes("mask-image:url(icons/avatar/hair_bob.png)"), "遮罩指向 icons/avatar 底下的圖");
check(html.includes("aria-label"), "帶有無障礙描述");

console.log(failures ? `\n${failures} 項失敗` : "\n全部通過");
process.exit(failures ? 1 : 0);
