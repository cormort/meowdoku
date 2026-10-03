// tests/avatar.test.mjs — 驗證主角造型的資料與繪製
// 用法：node tests/avatar.test.mjs
import { AVATAR_PARTS, avatarLabel, defaultAvatar, normalizeAvatar, randomAvatar, renderAvatar } from "../js/avatar.js";

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

console.log("=== 角色繪製 ===");
const svg = renderAvatar({ ...defaultAvatar(), top: "sailor", hat: "straw", accessory: "glasses" });
check(svg.startsWith("<svg") && svg.includes("</svg>"), "輸出是完整的 SVG");
check((svg.match(/<svg/g) || []).length === 1, "只有一個根 svg 元素");
check(svg.includes("avatar-svg"), "帶有 avatar-svg class 方便套樣式");
check(svg.includes("straw") === false && svg.includes("#e8c97a"), "草帽顏色有畫進去");
check(svg.includes("<circle"), "有畫臉部（眼睛/腮紅）");
const backpack = renderAvatar({ ...defaultAvatar(), accessory: "backpack" });
check(backpack.includes("#8a5a34"), "背包配件會畫出來");
const plain = renderAvatar(defaultAvatar());
check(!plain.includes("#8a5a34"), "沒選背包時不會畫背包");
check(renderAvatar(defaultAvatar(), { size: 90 }).includes('width="90"'), "可以指定尺寸");

console.log(failures ? `\n${failures} 項失敗` : "\n全部通過");
process.exit(failures ? 1 : 0);
