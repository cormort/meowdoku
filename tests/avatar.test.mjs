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
check(files[0] === "base_g4", "第一層是基本身體（預設四年級）");
check(
  files.join(",") === "base_g4,bottom_jeans,shoes_sneaker,top_sailor,hair_bob,hat_straw,acc_glasses",
  `疊圖順序正確（${files.join(" → ")}）`,
);
check(files.indexOf("top_sailor") > files.indexOf("bottom_jeans"), "上衣蓋在褲裙之上");
check(files.indexOf("hair_bob") > files.indexOf("top_sailor"), "頭髮疊在上衣之上");
const withPack = avatarLayers({ ...defaultAvatar(), accessory: "backpack" }).map((l) => l.file);
check(withPack[0] === "acc_backpack" && withPack[1] === "base_g4", "背包畫在身體後面");
check(!avatarLayers(defaultAvatar()).some((l) => l.file.startsWith("hat_")), "沒戴帽子時不會有帽子圖層");

console.log("=== 上色 ===");
const layers = avatarLayers({ ...defaultAvatar(), hairColor: "pink", top: "hoodie" });
check(layers.find((l) => l.file.startsWith("base_g")).tint === false, "基本身體不上色（自帶膚色，改用濾鏡）");
check(layers.find((l) => l.file.startsWith("hair_")).color === "#e88aa8", "頭髮帶出髮色");
check(layers.find((l) => l.file.startsWith("top_")).color === "#6fa8dc", "上衣帶出衣服色");
check(layers.filter((l) => !l.file.startsWith("base_g")).every((l) => l.tint), "除了身體以外每一層都會上色");
check(layers.every((l) => l.alpha > 0 && l.alpha <= 1), "每層都有合法透明度");

console.log("=== 隨年級長大 ===");
check(GROWTH_GRADES.join(",") === "4,5,6,7,8,9", "四個年級到九年級都有對應身體");
check(avatarStage(4) === "g4" && avatarStage(9) === "g9" && avatarStage(12) === "g9" && avatarStage(1) === "g4", "年級會夾在 4~9");
check(avatarStage("6-1") === "g6" && gradeOfTerm("8-2") === 8, "冊次可以換算年級");
check(stageLabel("7-1") === "七年級", "有年級名稱");
check(
  GROWTH_GRADES.every((g) => STAGE_METRICS[`g${g}`] && STAGE_METRICS[`g${g}`].headW > 0),
  "每個階段都有量測資料",
);
check(
  STAGE_METRICS.g9.headW < STAGE_METRICS.g4.headW && STAGE_METRICS.g9.shoulder < STAGE_METRICS.g4.shoulder,
  "年級越高頭越小、肩膀越高（比例變成熟）",
);
const hairScale = GROWTH_GRADES.map((g) => stageTransform("hair_bob", g).scale);
check(hairScale[0] === 1 && hairScale[5] < 1, "頭髮會隨年級縮小（頭變小）");
const topScale = GROWTH_GRADES.map((g) => stageTransform("top_tshirt", g).scale);
check(topScale[5] > topScale[0], "上衣會隨年級放大（軀幹變長）");
check(stageTransform("shoes_sneaker", 9).scale > 0 && stageTransform("hat_cap", 9).scale < 1, "鞋子與帽子也會依年級變形（腳不變位、帽子縮小）");
const big = avatarLayers(defaultAvatar(), 9).map((l) => l.file);
check(big[0] === "base_g9", "九年級用 base_g9 身體");
check(avatarLayers(defaultAvatar(), "5-1").some((l) => l.file === "base_g5"), "冊次 5-1 用 base_g5 身體");

console.log("=== 圖層檔案都在 ===");
const needed = new Set(GROWTH_GRADES.map((g) => `base_g${g}`));
for (const hair of AVATAR_PARTS.hair) needed.add(`hair_${hair.id}`);
for (const t of AVATAR_PARTS.top) needed.add(`top_${t.id}`);
for (const b of AVATAR_PARTS.bottom) needed.add(`bottom_${b.id}`);
for (const sh of AVATAR_PARTS.shoes) needed.add(`shoes_${sh.id}`);
for (const h of AVATAR_PARTS.hat) if (h.id !== "none") needed.add(`hat_${h.id}`);
for (const ac of AVATAR_PARTS.accessory) if (ac.id !== "none") needed.add(`acc_${ac.id}`);
const missing = [...needed].filter((f) => !existsSync(join(ROOT, avatarLayerUrl(f))));
check(missing.length === 0, `每個可選項目都有對應的 PNG（缺 ${missing.length} 張${missing.length ? ": " + missing.join(", ") : ""}）`);
check(needed.size === 38, `需要的圖層共 ${needed.size} 張（六個年級身體 + 衣服配件）`);

console.log("=== 角色輸出 ===");
const html = renderAvatar({ ...defaultAvatar(), top: "sailor", hat: "straw" }, { size: 200 });
check(html.startsWith('<div class="avatar-png"'), "輸出是可縮放的 div 容器");
const count = (html.match(/class="av-layer"/g) || []).length;
check(count === 6, `六個圖層疊起來（身體／褲／鞋／上衣／髮／帽，實際 ${count}）`);
check(renderAvatar({ ...defaultAvatar(), accessory: "glasses" }).includes("acc_glasses.png"), "戴眼鏡會多一層配件圖層");
check(html.includes("--av-w:200px"), "可以指定尺寸");
check(html.includes("icons/avatar/hair_bob.png") && html.includes('class="av-img"'), "用 img 載入 AI 重繪的圖層");
check(html.includes("av-tint"), "上色層用 .av-tint（CSS 走 multiply，保留 AI 的陰影）");
check(html.includes("mask-image:url(") && (html.match(/hair_bob\.png/g) || []).length >= 2, "上色層拿同一張圖當遮罩，顏色只落在圖案上");
check(renderAvatar({ ...defaultAvatar(), skin: "deep" }).includes("filter:saturate(1.45)"), "深色膚色會套濾鏡");
check(!renderAvatar(defaultAvatar()).includes("filter:"), "預設膚色不加濾鏡");
check(html.includes("aria-label"), "帶有無障礙描述");

console.log(failures ? `\n${failures} 項失敗` : "\n全部通過");
process.exit(failures ? 1 : 0);
