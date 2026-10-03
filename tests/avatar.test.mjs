// tests/avatar.test.mjs — 驗證主角造型的資料與 PNG 分層繪製（Nano Banana 重繪素材）
// 用法：node tests/avatar.test.mjs
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AVATAR_PARTS, GROWTH_GRADES, SKIN_FILTER, STAGE_METRICS, avatarLabel, avatarLayerUrl, avatarLayers, avatarStage, defaultAvatar, gradeOfTerm, normalizeAvatar, randomAvatar, renderAvatar, stageLabel, stageTransform } from "../js/avatar.js";

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
check(Object.keys(SKIN_FILTER).length === AVATAR_PARTS.skin.length, "每個膚色都有對應的調整濾鏡");

console.log("=== 造型存取 ===");
check(normalizeAvatar(null).hair === defaultAvatar().hair, "沒有造型時用預設值");
check(normalizeAvatar({ hair: "不存在的髮型", top: "hoodie" }).top === "hoodie", "保留合法部位");
check(normalizeAvatar({ hair: "不存在的髮型" }).hair === defaultAvatar().hair, "不合法的部位會被換回預設");
const rnd = randomAvatar(() => 0.5);
check(Object.keys(rnd).length === 8 && normalizeAvatar(rnd).hair === rnd.hair, "隨機造型是合法的");
check(avatarLabel({ ...defaultAvatar(), hat: "cap", accessory: "glasses" }).includes("棒球帽"), "造型描述包含帽子");
check(avatarLabel(defaultAvatar()).includes("牛仔褲"), "造型描述包含褲子");

console.log("=== 圖層順序 ===");
const files = avatarLayers({ ...defaultAvatar(), top: "sailor", hat: "straw", accessory: "glasses" }).map((l) => l.file);
check(files[0] === "hairback_bob" && files[1] === "base_g4", "最底是後髮，接著是基本身體（預設四年級）");
check(
  files.join(",") === "hairback_bob,base_g4,bottom_jeans,shoes_sneaker,top_sailor,base_g4,hair_bob,hat_straw,acc_glasses",
  `疊圖順序正確（${files.join(" → ")}）`,
);
check(files.indexOf("top_sailor") > files.indexOf("bottom_jeans"), "上衣蓋在褲裙之上");
check(files.indexOf("hair_bob") > files.indexOf("top_sailor"), "頭髮疊在上衣之上");
const withPack = avatarLayers({ ...defaultAvatar(), accessory: "backpack" }).map((l) => l.file);
check(withPack[0] === "acc_backpack" && withPack[1] === "hairback_bob" && withPack[2] === "base_g4", "背包畫在後髮和身體後面");
check(!avatarLayers(defaultAvatar()).some((l) => l.file.startsWith("hat_")), "沒戴帽子時不會有帽子圖層");

console.log("=== 上色 ===");
const layers = avatarLayers({ ...defaultAvatar(), hairColor: "pink", top: "hoodie" });
check(layers.find((l) => l.file.startsWith("base_g")).tint === false, "基本身體不上色（自帶膚色，改用濾鏡）");
check(layers.find((l) => l.file.startsWith("hair_")).color === "#e88aa8", "頭髮帶出髮色");
check(layers.find((l) => l.file.startsWith("hairback_")).color === "#e88aa8", "後髮和前髮同色");
check(stageTransform("hairback_bob", 9).sx === stageTransform("hair_bob", 9).sx && stageTransform("hairback_bob", 9).dy === stageTransform("hair_bob", 9).dy, "後髮跟著頭變形，和前髮對齊");
check(layers.find((l) => l.file.startsWith("top_")).color === "#6fa8dc", "上衣帶出衣服色");
check(layers.filter((l) => !l.file.startsWith("base_g")).every((l) => l.tint), "除了身體以外每一層都會上色");
check(layers.every((l) => l.alpha > 0 && l.alpha <= 1), "每層都有合法透明度");

console.log("=== 隨年級長大 ===");
check(GROWTH_GRADES.join(",") === "4,5,6,7,8,9", "四個年級到九年級都有對應身體");
check(avatarStage(4) === "g4" && avatarStage(9) === "g9" && avatarStage(12) === "g9" && avatarStage(1) === "g4", "年級會夾在 4~9");
check(avatarStage("6-1") === "g6" && gradeOfTerm("8-2") === 8, "冊次可以換算年級");
check(stageLabel("7-1") === "七年級", "有年級名稱");
check(
  GROWTH_GRADES.every((g) => STAGE_METRICS[`g${g}`] && STAGE_METRICS[`g${g}`].headR > STAGE_METRICS[`g${g}`].headL && STAGE_METRICS[`g${g}`].feet > STAGE_METRICS[`g${g}`].ankle),
  "每個階段都有量測資料",
);
const hw = (m) => m.headR - m.headL;
check(hw(STAGE_METRICS.g9) < hw(STAGE_METRICS.g4) && STAGE_METRICS.g9.collar < STAGE_METRICS.g4.collar, "年級越高頭越小、肩膀越高（比例變成熟）");
const tf = (part, g) => stageTransform(part, g);
check(tf("hair_bob", 4).sx === 1 && tf("hair_bob", 4).sy === 1 && tf("hair_bob", 9).sx < 1, "頭髮會隨年級縮小（頭變小），四年級不變");
check(tf("top_tshirt", 9).sx < 1 && tf("top_tshirt", 9).sy > tf("top_tshirt", 9).sx, "上衣寬高分開縮放（高年級變瘦但不變矮）");
check(tf("bottom_jeans", 9).sy > 1 && tf("bottom_jeans", 9).sx < 1, "褲子隨腿變長變細");
check(tf("shoes_sneaker", 9).sx === tf("shoes_sneaker", 9).sy && tf("shoes_sneaker", 9).oy === STAGE_METRICS.g4.feet, "鞋子等比例縮、以腳底為原點");
check(tf("acc_badge", 9).sx === tf("top_tshirt", 9).sx && tf("acc_glasses", 9).sx === tf("hair_bob", 9).sx, "名牌跟軀幹走，眼鏡跟頭走");
// 錨點對位：參考身體的胯下／腳踝／腳底／脖子，變形後要落在各年級身體的同一條線上
const at = (t, y) => t.oy + t.dy + t.sy * (y - t.oy);
for (const g of GROWTH_GRADES) {
  const m = STAGE_METRICS[`g${g}`], ref = STAGE_METRICS.g4;
  const ok =
    Math.abs(at(tf("bottom_jeans", g), ref.crotch) - m.crotch) < 0.01 &&
    Math.abs(at(tf("bottom_jeans", g), ref.ankle) - m.ankle) < 0.01 &&
    Math.abs(at(tf("shoes_sneaker", g), ref.feet) - m.feet) < 0.01 &&
    Math.abs(at(tf("hair_bob", g), ref.neck) - m.neck) < 0.01;
  check(ok, `${g} 年級：褲裙對到胯下與腳踝、鞋子對到腳底、頭髮對到脖子`);
}
// 四年級時每件上衣都從同一條領口線開始，下襬蓋過褲裙腰頭（343）
for (const t of AVATAR_PARTS.top) {
  const x = tf(`top_${t.id}`, 4);
  const box = { tshirt: 356, hoodie: 373, shirt: 352, sailor: 342, sweater: 354, vest: 408 }[t.id];
  check(Math.abs(at(x, x.oy) - 202) < 0.01 && at(x, box) >= 356 - 0.01, `上衣「${t.name}」對齊領口線、下襬蓋過腰頭`);
}
const big = avatarLayers(defaultAvatar(), 9).map((l) => l.file);
check(big[1] === "base_g9", "九年級用 base_g9 身體");
check(avatarLayers(defaultAvatar(), "5-1").some((l) => l.file === "base_g5"), "冊次 5-1 用 base_g5 身體");

console.log("=== 圖層檔案都在 ===");
const needed = new Set(GROWTH_GRADES.map((g) => `base_g${g}`));
for (const hair of AVATAR_PARTS.hair) needed.add(`hair_${hair.id}`).add(`hairback_${hair.id}`);
for (const t of AVATAR_PARTS.top) needed.add(`top_${t.id}`);
for (const b of AVATAR_PARTS.bottom) needed.add(`bottom_${b.id}`);
for (const sh of AVATAR_PARTS.shoes) needed.add(`shoes_${sh.id}`);
for (const h of AVATAR_PARTS.hat) if (h.id !== "none") needed.add(`hat_${h.id}`);
for (const ac of AVATAR_PARTS.accessory) if (ac.id !== "none") needed.add(`acc_${ac.id}`);
const missing = [...needed].filter((f) => !existsSync(join(ROOT, avatarLayerUrl(f))));
check(missing.length === 0, `每個可選項目都有對應的 PNG（缺 ${missing.length} 張${missing.length ? ": " + missing.join(", ") : ""}）`);
check(needed.size === 44, `需要的圖層共 ${needed.size} 張（六個年級身體 + 前後髮 + 衣服配件）`);

console.log("=== 角色輸出 ===");
const html = renderAvatar({ ...defaultAvatar(), top: "sailor", hat: "straw" }, { size: 200 });
check(html.startsWith('<div class="avatar-png"'), "輸出是可縮放的 div 容器");
const count = (html.match(/class="av-layer"/g) || []).length;
check(count === 8, `八個圖層疊起來（後髮／身體／褲／鞋／上衣／頭脖子／前髮／帽，實際 ${count}）`);
const order = avatarLayers({ ...defaultAvatar(), top: "sailor" }, 7);
const headIdx = order.findIndex((l) => l.clip);
check(
  headIdx > order.findIndex((l) => l.file === "top_sailor") && headIdx < order.findIndex((l) => l.file === "hair_bob") && order[headIdx].file === "base_g7",
  "頭和脖子（同年級身體裁切）疊在上衣前面、頭髮後面",
);
check(html.includes("clip-path:polygon("), "頭脖子圖層用 clip-path 只留脖子以上");
check(renderAvatar({ ...defaultAvatar(), accessory: "glasses" }).includes("acc_glasses.png"), "戴眼鏡會多一層配件圖層");
check(html.includes("--av-w:200px"), "可以指定尺寸");
check(html.includes("icons/avatar/hair_bob.png") && html.includes('class="av-img"'), "用 img 載入 AI 重繪的圖層");
check(html.includes("av-tint"), "上色層用 .av-tint（CSS 走 multiply，保留 AI 的陰影）");
check(html.includes("mask-image:url(") && (html.match(/hair_bob\.png/g) || []).length >= 2, "上色層拿同一張圖當遮罩，顏色只落在圖案上");
check((renderAvatar({ ...defaultAvatar(), skin: "deep" }).match(/filter:saturate\(1\.45\)/g) || []).length === 2, "深色膚色會套濾鏡（身體和頭脖子兩層都要）");
check(!/<img[^>]*filter:/.test(renderAvatar(defaultAvatar())), "預設膚色不加濾鏡");
check(html.includes("aria-label"), "帶有無障礙描述");

console.log(failures ? `\n${failures} 項失敗` : "\n全部通過");
process.exit(failures ? 1 : 0);
