// avatar.js — 主角（玩家自己）的角色與裝扮外觀
// 用分層 SVG 畫出角色，每個部位都能換（膚色、髮型、髮色、上衣、褲裙、鞋子、帽子、配件），
// 存進 petData.avatar。這裡只有資料與純函式，UI 由 pet.js 呈現。

export const AVATAR_PARTS = {
  skin: [
    { id: "light", name: "白皙", value: "#ffe1c9" },
    { id: "warm", name: "健康", value: "#f7cba4" },
    { id: "tan", name: "小麥", value: "#e0a878" },
    { id: "deep", name: "深色", value: "#b57a52" },
  ],
  hair: [
    { id: "short", name: "短髮" },
    { id: "bob", name: "妹妹頭" },
    { id: "twin", name: "雙馬尾" },
    { id: "pony", name: "馬尾" },
    { id: "curly", name: "捲捲頭" },
    { id: "bowl", name: "西瓜皮" },
  ],
  hairColor: [
    { id: "black", name: "黑", value: "#3a2f2a" },
    { id: "brown", name: "棕", value: "#8a5a34" },
    { id: "blonde", name: "金", value: "#e0b45c" },
    { id: "pink", name: "粉", value: "#e88aa8" },
    { id: "blue", name: "藍", value: "#5d86d8" },
    { id: "mint", name: "薄荷", value: "#5cc9a7" },
  ],
  top: [
    { id: "tshirt", name: "T 恤", value: "#ffffff" },
    { id: "hoodie", name: "連帽外套", value: "#6fa8dc" },
    { id: "shirt", name: "襯衫", value: "#dbe7f5" },
    { id: "sailor", name: "水手服", value: "#f4f7fb" },
    { id: "sweater", name: "毛衣", value: "#f2b880" },
    { id: "vest", name: "背心", value: "#a8d5a2" },
  ],
  bottom: [
    { id: "jeans", name: "牛仔褲", value: "#4a6fa5" },
    { id: "shorts", name: "短褲", value: "#7a5c46" },
    { id: "skirt", name: "百褶裙", value: "#d46a8a" },
    { id: "pleat", name: "長裙", value: "#8c6bb1" },
    { id: "sport", name: "運動褲", value: "#4f6b52" },
  ],
  shoes: [
    { id: "sneaker", name: "運動鞋", value: "#f0f0f0" },
    { id: "boots", name: "短靴", value: "#6b4a35" },
    { id: "loafer", name: "皮鞋", value: "#3f3a36" },
    { id: "sandal", name: "涼鞋", value: "#c98a5b" },
    { id: "rainboot", name: "雨鞋", value: "#f2c744" },
  ],
  hat: [
    { id: "none", name: "不戴" },
    { id: "cap", name: "棒球帽", value: "#e0574f" },
    { id: "beanie", name: "毛帽", value: "#7fb0d8" },
    { id: "straw", name: "草帽", value: "#e8c97a" },
    { id: "beret", name: "貝雷帽", value: "#b07fc0" },
    { id: "bow", name: "蝴蝶結", value: "#ef7fa8" },
  ],
  accessory: [
    { id: "none", name: "不戴" },
    { id: "glasses", name: "眼鏡" },
    { id: "scarf", name: "圍巾" },
    { id: "backpack", name: "背包" },
    { id: "headphone", name: "耳機" },
    { id: "badge", name: "名牌" },
  ],
};

export function defaultAvatar() {
  return {
    skin: "light",
    hair: "bob",
    hairColor: "black",
    top: "tshirt",
    bottom: "jeans",
    shoes: "sneaker",
    hat: "none",
    accessory: "none",
  };
}
export function normalizeAvatar(a) {
  const base = defaultAvatar();
  const out = { ...base };
  if (a && typeof a === "object") {
    for (const key of Object.keys(base)) {
      if (typeof a[key] === "string" && AVATAR_PARTS[key].some((o) => o.id === a[key])) out[key] = a[key];
    }
  }
  return out;
}
function partValue(key, id, fallback) {
  const item = AVATAR_PARTS[key].find((o) => o.id === id);
  return item?.value || fallback;
}
export function randomAvatar(rng = Math.random) {
  const pick = (key) => AVATAR_PARTS[key][Math.floor(rng() * AVATAR_PARTS[key].length)].id;
  return { ...defaultAvatar(), hair: pick("hair"), hairColor: pick("hairColor"), top: pick("top"), bottom: pick("bottom"), shoes: pick("shoes"), hat: pick("hat"), accessory: pick("accessory"), skin: pick("skin") };
}

// ── 角色繪製（PNG 分層）──
// 素材在 icons/avatar/：每張都是「白色形狀 + alpha」的遮罩 PNG，尺寸 260x400 對齊，
// 這裡用 CSS mask-image 上色，所以換顏色不需要換圖。
const ACC_COLOR = { glasses: "#333333", scarf: "#e0574f", backpack: "#8a5a34", headphone: "#3a3a3a", badge: "#c9a227" };

export function avatarLayerUrl(file) {
  return `icons/avatar/${file}.png`;
}

// 回傳 [{ file, color, alpha }]，順序＝疊圖順序（背包在最後面、臉在頭髮之後）
export function avatarLayers(input) {
  const a = normalizeAvatar(input);
  const out = [];
  const push = (file, color, alpha) => out.push({ file, color, alpha: alpha ?? 1 });
  if (a.accessory === "backpack") push("acc_backpack", ACC_COLOR.backpack, 0.92);
  push("base", partValue("skin", a.skin, "#ffe1c9"));
  push("face_blush", "#f19a9a", 0.45);
  push(`bottom_${a.bottom}`, partValue("bottom", a.bottom, "#4a6fa5"));
  push(`shoes_${a.shoes}`, partValue("shoes", a.shoes, "#eeeeee"));
  push(`top_${a.top}`, partValue("top", a.top, "#ffffff"));
  push(`hair_${a.hair}`, partValue("hairColor", a.hairColor, "#3a2f2a"));
  push("face_eyes", "#2b2b2b");
  push("face_shine", "#ffffff", 0.92);
  push("face_mouth", "#b3604f");
  if (a.hat !== "none") push(`hat_${a.hat}`, partValue("hat", a.hat, "#e0574f"));
  if (a.accessory !== "none" && a.accessory !== "backpack") push(`acc_${a.accessory}`, ACC_COLOR[a.accessory] || "#8a5a34");
  return out;
}

export function renderAvatar(input, { size = 150 } = {}) {
  const a = normalizeAvatar(input);
  const layers = avatarLayers(a)
    .map((l) => {
      const url = avatarLayerUrl(l.file);
      return `<span class="av-layer" style="background:${l.color};opacity:${l.alpha};-webkit-mask-image:url(${url});mask-image:url(${url})"></span>`;
    })
    .join("");
  return `<div class="avatar-png" style="--av-w:${size}px" role="img" aria-label="我的角色：${avatarLabel(a)}">${layers}</div>`;
}

// 造型的完整描述（給 UI 顯示目前穿什麼）
export function avatarLabel(input) {
  const n = normalizeAvatar(input);
  const name = (key, id) => AVATAR_PARTS[key].find((o) => o.id === id)?.name || "";
  return `${name("hair", n.hair)}／${name("hairColor", n.hairColor)}／${name("skin", n.skin)}／${name("top", n.top)}／${name("bottom", n.bottom)}／${name("shoes", n.shoes)}${
    n.hat !== "none" ? `／${name("hat", n.hat)}` : ""
  }${n.accessory !== "none" ? `／${name("accessory", n.accessory)}` : ""}`;
}
