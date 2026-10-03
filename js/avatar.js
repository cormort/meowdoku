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

// ── 隨年級長大 ──
// 每個年級一個身體（base_g4 … base_g9）；衣服共用同一組圖層，
// 依各階段量到的頭寬／軀幹長／腿長縮放並平移，所以不用為每個年級重畫衣服。
export const GROWTH_GRADES = [4, 5, 6, 7, 8, 9];

// 各階段量測值（相對於 512x512 畫布的比例）：
// headTop/headW = 頭頂與頭寬；shoulder/hip/feet = 肩、腰、腳底
export const STAGE_METRICS = {
  g4: { label: "四年級", headTop: 0.113, headW: 0.27, shoulder: 0.42, hip: 0.775, feet: 0.963 },
  g5: { label: "五年級", headTop: 0.113, headW: 0.174, shoulder: 0.322, hip: 0.775, feet: 0.963 },
  g6: { label: "六年級", headTop: 0.113, headW: 0.205, shoulder: 0.348, hip: 0.775, feet: 0.963 },
  g7: { label: "七年級", headTop: 0.113, headW: 0.158, shoulder: 0.309, hip: 0.775, feet: 0.963 },
  g8: { label: "八年級", headTop: 0.113, headW: 0.135, shoulder: 0.289, hip: 0.775, feet: 0.963 },
  g9: { label: "九年級", headTop: 0.113, headW: 0.156, shoulder: 0.307, hip: 0.775, feet: 0.963 },
};
const REF_STAGE = "g4"; // 衣服圖層是以這個階段的身體對齊的

export function gradeOfTerm(term) {
  const g = parseInt(String(term || "").split("-")[0], 10);
  return Number.isFinite(g) ? Math.min(9, Math.max(4, g)) : 4;
}
export function avatarStage(gradeOrTerm) {
  const g = typeof gradeOrTerm === "string" && gradeOrTerm.includes("-") ? gradeOfTerm(gradeOrTerm) : Number(gradeOrTerm);
  const g2 = Number.isFinite(g) ? Math.min(9, Math.max(4, g)) : 4;
  return `g${g2}`;
}
export function stageLabel(gradeOrTerm) {
  return STAGE_METRICS[avatarStage(gradeOrTerm)]?.label || "";
}
// 依階段算出每種圖層要縮放／平移多少（相對於衣服圖層的參考階段）
export function stageTransform(part, gradeOrTerm) {
  const st = STAGE_METRICS[avatarStage(gradeOrTerm)] || STAGE_METRICS[REF_STAGE];
  const ref = STAGE_METRICS[REF_STAGE];
  const key = part.startsWith("hat") || part.startsWith("acc_") || part.startsWith("hair") ? "head" : part;
  const ratio = (a, b) => (b ? a / b : 1);
  const H = 512;
  if (key === "head") {
    return { scale: ratio(st.headW, ref.headW), dy: (st.headTop - ref.headTop) * H };
  }
  if (part.startsWith("top")) {
    return { scale: ratio(st.hip - st.shoulder, ref.hip - ref.shoulder), dy: (st.shoulder - ref.shoulder) * H };
  }
  if (part.startsWith("bottom")) {
    return { scale: ratio(st.feet - st.hip, ref.feet - ref.hip), dy: (st.hip - ref.hip) * H };
  }
  if (part.startsWith("shoes")) {
    return { scale: ratio(st.feet - st.hip, ref.feet - ref.hip), dy: (st.feet - ref.feet) * H };
  }
  return { scale: 1, dy: 0 };
}
// 各圖層縮放的基準線（Y，佔畫布百分比）：stageTransform 的 dy 假設圖層是繞著自己的錨點縮放
// （頭＝頭頂、上衣＝肩、褲裙＝腰、鞋＝腳底），所以 transform-origin 必須設在同一條線上
export function stageOriginY(part) {
  const ref = STAGE_METRICS[REF_STAGE];
  if (part.startsWith("top")) return ref.shoulder * 100;
  if (part.startsWith("bottom")) return ref.hip * 100;
  if (part.startsWith("shoes")) return ref.feet * 100;
  if (part.startsWith("hat") || part.startsWith("acc_") || part.startsWith("hair")) return ref.headTop * 100;
  return 0;
}

// ── 角色繪製（PNG 分層）──
// 素材在 icons/avatar/：Nano Banana 重繪的彩色 PNG（512x512 對齊，白色／灰階底稿），
// 顏色在遊戲裡用 mix-blend-mode: multiply 疊上去，所以一種形狀一張圖、顏色可換、AI 的陰影保留。
const ACC_COLOR = { glasses: "#333333", scarf: "#e0574f", backpack: "#8a5a34", headphone: "#3a3a3a", badge: "#c9a227" };

// 膚色用濾鏡調整基本身體（AI 重繪的膚色為預設「白皙」）
export const SKIN_FILTER = {
  light: "",
  warm: "saturate(1.12) brightness(0.98) sepia(0.1)",
  tan: "saturate(1.3) brightness(0.9) sepia(0.24)",
  deep: "saturate(1.45) brightness(0.76) sepia(0.4)",
};

// 相對路徑（測試用）；實際載入用 avatarLayerSrc 解析成絕對網址，子路徑部署也正確
export function avatarLayerUrl(file) {
  return `icons/avatar/${file}.png`;
}
export function avatarLayerSrc(file) {
  return new URL(`../${avatarLayerUrl(file)}`, import.meta.url).href;
}

// 回傳 [{ file, color, alpha, tint }]，順序＝疊圖順序（背包在最底、臉已含在 base 裡）
export function avatarLayers(input, gradeOrTerm = 4) {
  const a = normalizeAvatar(input);
  const stage = avatarStage(gradeOrTerm);
  const out = [];
  const push = (file, color, alpha, tint = true) => out.push({ file, color, alpha: alpha ?? 1, tint, part: file });
  if (a.accessory === "backpack") push("acc_backpack", ACC_COLOR.backpack, 0.94);
  push(`base_${stage}`, "#ffffff", 1, false); // 基本身體自帶膚色，不上色（依年級換身體）
  push(`bottom_${a.bottom}`, partValue("bottom", a.bottom, "#4a6fa5"));
  push(`shoes_${a.shoes}`, partValue("shoes", a.shoes, "#eeeeee"));
  push(`top_${a.top}`, partValue("top", a.top, "#ffffff"));
  push(`hair_${a.hair}`, partValue("hairColor", a.hairColor, "#3a2f2a"));
  if (a.hat !== "none") push(`hat_${a.hat}`, partValue("hat", a.hat, "#e0574f"));
  if (a.accessory !== "none" && a.accessory !== "backpack") push(`acc_${a.accessory}`, ACC_COLOR[a.accessory] || "#8a5a34");
  return out;
}

export function renderAvatar(input, { size = 150, grade = 4 } = {}) {
  const a = normalizeAvatar(input);
  const stage = avatarStage(grade);
  const layers = avatarLayers(a, grade)
    .map((l) => {
      const url = avatarLayerSrc(l.file);
      const isBase = l.file.startsWith("base_");
      const filter = isBase ? SKIN_FILTER[a.skin] || "" : "";
      // 依年級把衣服縮放／平移（頭髮、配件跟著頭；上衣跟肩；褲裙跟腰；鞋子跟腳）
      let tf = "";
      if (!isBase) {
        const t = stageTransform(l.file, grade);
        const origin = `50% ${stageOriginY(l.file).toFixed(2)}%`;
        if (t.scale !== 1 || t.dy !== 0) {
          const dyPct = (t.dy / 512) * 100;
          tf = ` style="transform-origin:${origin};transform:translateY(${dyPct.toFixed(2)}%) scale(${t.scale.toFixed(3)})"`;
        }
      }
      const img = `<img class="av-img" src="${url}" alt=""${filter ? ` style="filter:${filter}"` : ""}>`;
      const tint = l.tint
        ? `<i class="av-tint" style="background:${l.color};opacity:${l.alpha};-webkit-mask-image:url(${url});mask-image:url(${url})"></i>`
        : "";
      return `<span class="av-layer"${tf}>${img}${tint}</span>`;
    })
    .join("");
  return `<div class="avatar-png" style="--av-w:${size}px" data-stage="${stage}" role="img" aria-label="我的角色（${stageLabel(grade)}）：${avatarLabel(a)}">${layers}</div>`;
}

// 造型的完整描述（給 UI 顯示目前穿什麼）
export function avatarLabel(input) {
  const n = normalizeAvatar(input);
  const name = (key, id) => AVATAR_PARTS[key].find((o) => o.id === id)?.name || "";
  return `${name("hair", n.hair)}／${name("hairColor", n.hairColor)}／${name("skin", n.skin)}／${name("top", n.top)}／${name("bottom", n.bottom)}／${name("shoes", n.shoes)}${
    n.hat !== "none" ? `／${name("hat", n.hat)}` : ""
  }${n.accessory !== "none" ? `／${name("accessory", n.accessory)}` : ""}`;
}
