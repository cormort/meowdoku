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
// 每個年級一個身體（base_g4 … base_g9）；衣服共用同一組圖層（以 g4 身體對齊畫的），
// 依各階段身體的錨點把每種圖層「寬、高分開」縮放再平移，所以不用為每個年級重畫衣服。
export const GROWTH_GRADES = [4, 5, 6, 7, 8, 9];

// 各階段錨點（512x512 畫布的像素座標），由 tools/measure_avatar.mjs 從身體 PNG 量出來：
// headTop/neck/headL/headR＝頭頂、脖子、頭左右（含耳朵）；neckL/neckR＝脖子最細處左右；collar/crotch＝連身衣領口、胯下；
// armL/armR＝軀幹含手臂的最外側；hipL/hipR＝臀寬；ankle/feet＝腳踝、腳底；feetL/feetR＝兩腳外側
export const STAGE_METRICS = {
  g4: { label: "四年級", headTop: 57, neck: 207, neckL: 242, neckR: 268, headL: 185, headR: 325, collar: 219, crotch: 345, armL: 177, armR: 333, hipL: 210, hipR: 300, ankle: 463, feet: 494, feetL: 218, feetR: 292 },
  g5: { label: "五年級", headTop: 57, neck: 158, neckL: 245, neckR: 266, headL: 211, headR: 300, collar: 172, crotch: 326, armL: 188, armR: 323, hipL: 217, hipR: 295, ankle: 453, feet: 494, feetL: 224, feetR: 287 },
  g6: { label: "六年級", headTop: 57, neck: 170, neckL: 244, neckR: 267, headL: 202, headR: 308, collar: 185, crotch: 317, armL: 183, armR: 328, hipL: 213, hipR: 297, ankle: 456, feet: 494, feetL: 216, feetR: 295 },
  g7: { label: "七年級", headTop: 57, neck: 148, neckL: 245, neckR: 266, headL: 215, headR: 296, collar: 164, crotch: 289, armL: 197, armR: 314, hipL: 219, hipR: 292, ankle: 451, feet: 494, feetL: 227, feetR: 284 },
  g8: { label: "八年級", headTop: 57, neck: 141, neckL: 246, neckR: 265, headL: 221, headR: 290, collar: 160, crotch: 287, armL: 198, armR: 313, hipL: 219, hipR: 292, ankle: 467, feet: 494, feetL: 232, feetR: 280 },
  g9: { label: "九年級", headTop: 57, neck: 150, neckL: 247, neckR: 264, headL: 214, headR: 296, collar: 163, crotch: 287, armL: 199, armR: 311, hipL: 222, hipR: 288, ankle: 451, feet: 494, feetL: 227, feetR: 284 },
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
// 每種圖層跟著哪一段身體走：回傳 [左, 右, 上, 下]（上＝錨點，縮放時固定在這條線上）
// 頭髮／帽子／眼鏡／耳機跟頭；上衣／圍巾／名牌／背包跟軀幹；褲裙從胯下到腳踝；鞋子以腳底為準
function regionBox(part, m) {
  if (part.startsWith("top") || part === "acc_scarf" || part === "acc_badge" || part === "acc_backpack") return [m.armL, m.armR, m.collar, m.crotch];
  if (part.startsWith("bottom")) return [m.hipL, m.hipR, m.crotch, m.ankle];
  if (part.startsWith("shoes")) return [m.feetL, m.feetR, m.feet, m.feet];
  if (part.startsWith("hat") || part.startsWith("acc_") || part.startsWith("hair")) return [m.headL, m.headR, m.headTop, m.neck];
  return null;
}
// 上衣各自的 [上緣, 下襬, 加寬]（上緣／下襬是 g4 座標，alpha 量的）。AI 畫的上衣高低胖瘦不一：
// 有的肩膀太低太窄會露肩，有的下襬碰不到褲裙腰頭會露出一條皮膚，
// 所以先把每件上衣拉到同一條領口線、下襬至少蓋過腰頭、肩膀窄的加寬，再套年級變形
const TOP_BOX = { tshirt: [202, 356, 1], hoodie: [220, 373, 1.18], shirt: [202, 352, 1.05], sailor: [203, 342, 1], sweater: [222, 354, 1.08], vest: [203, 408, 1] };
// 褲裙加寬：長裙畫得比兩腿還窄，兩側會露出腿
const BOTTOM_WIDEN = { pleat: 1.4 };
const TOP_NECK = 202; // 上衣上緣要到的線（脖子根部）
const TOP_MIN_HEM = 356; // 下襬至少到這裡（褲裙腰頭在 343，至少重疊 13px）
// 依階段算出圖層的變形：以 (ox, oy) 為原點，寬縮 sx、高縮 sy，再平移 (dx, dy)（像素）
export function stageTransform(part, gradeOrTerm) {
  const st = STAGE_METRICS[avatarStage(gradeOrTerm)] || STAGE_METRICS[REF_STAGE];
  const ref = STAGE_METRICS[REF_STAGE];
  const r = regionBox(part, ref);
  const t = regionBox(part, st);
  if (!r) return { sx: 1, sy: 1, dx: 0, dy: 0, ox: 256, oy: 0 };
  const sx = (t[1] - t[0]) / (r[1] - r[0]);
  // 鞋子沒有高度可比，跟寬度等比例縮（腳底不動）
  const sy = r[3] === r[2] ? sx : (t[3] - t[2]) / (r[3] - r[2]);
  const ox = (r[0] + r[1]) / 2;
  const dx = (t[0] + t[1]) / 2 - ox;
  const box = part.startsWith("top_") && TOP_BOX[part.slice(4)];
  if (box) {
    // 先把上衣 [上緣, 下襬] 拉到 [TOP_NECK, 下襬或 TOP_MIN_HEM]，再套年級變形（兩段合成一個變形，原點放在上衣上緣）
    const k = (Math.max(box[1], TOP_MIN_HEM) - TOP_NECK) / (box[1] - box[0]);
    return { sx: sx * box[2], sy: sy * k, dx, dy: t[2] - box[0] + sy * (TOP_NECK - r[2]), ox, oy: box[0] };
  }
  const widen = (part.startsWith("bottom_") && BOTTOM_WIDEN[part.slice(7)]) || 1;
  return { sx: sx * widen, sy, dx, dy: t[2] - r[2], ox, oy: r[2] };
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

// 頭＋脖子要疊在上衣領口前面：把身體圖再疊一次，只留脖子以上（頭整片＋脖子往下一截），
// 脖子下緣切成 U 形（兩側淺、中間到領口），像衣服的圓領；回傳 CSS clip-path
export function headClip(gradeOrTerm) {
  const m = STAGE_METRICS[avatarStage(gradeOrTerm)];
  const p = (v) => ((v / 512) * 100).toFixed(2) + "%";
  const l = m.neckL - 1, r = m.neckR + 1, n = m.neck;
  const depth = m.collar - n;
  // U 形：從右側往下繞到左側，y = 脖子 + 深度 × (0.45 + 0.55 × (1 − x²))
  const u = [];
  for (let i = 0; i <= 8; i++) {
    const t = 1 - (i / 8) * 2; // 1 → -1（右 → 左）
    u.push(`${p((l + r) / 2 + (t * (r - l)) / 2)} ${p(n + depth * (0.45 + 0.55 * (1 - t * t)))}`);
  }
  return `polygon(0 0,100% 0,100% ${p(n)},${p(r)} ${p(n)},${u.join(",")},${p(l)} ${p(n)},0 ${p(n)})`;
}

// 回傳 [{ file, color, alpha, tint, clip }]，順序＝疊圖順序（背包在最底、臉已含在 base 裡）
export function avatarLayers(input, gradeOrTerm = 4) {
  const a = normalizeAvatar(input);
  const stage = avatarStage(gradeOrTerm);
  const out = [];
  const push = (file, color, alpha, tint = true, clip = "") => out.push({ file, color, alpha: alpha ?? 1, tint, part: file, clip });
  if (a.accessory === "backpack") push("acc_backpack", ACC_COLOR.backpack, 0.94);
  push(`base_${stage}`, "#ffffff", 1, false); // 基本身體自帶膚色，不上色（依年級換身體）
  push(`bottom_${a.bottom}`, partValue("bottom", a.bottom, "#4a6fa5"));
  push(`shoes_${a.shoes}`, partValue("shoes", a.shoes, "#eeeeee"));
  push(`top_${a.top}`, partValue("top", a.top, "#ffffff"));
  push(`base_${stage}`, "#ffffff", 1, false, headClip(gradeOrTerm)); // 頭和脖子蓋在領口前面，頭髮再疊上去
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
      // 依年級把衣服縮放／平移（頭髮、帽子跟頭；上衣跟軀幹；褲裙跟腿；鞋子跟腳）
      let tf = "";
      if (!isBase) {
        const t = stageTransform(l.file, grade);
        if (t.sx !== 1 || t.sy !== 1 || t.dx !== 0 || t.dy !== 0) {
          const pct = (v) => ((v / 512) * 100).toFixed(2) + "%";
          tf = ` style="transform-origin:${pct(t.ox)} ${pct(t.oy)};transform:translate(${pct(t.dx)},${pct(t.dy)}) scale(${t.sx.toFixed(3)},${t.sy.toFixed(3)})"`;
        }
      }
      const css = (filter ? `filter:${filter};` : "") + (l.clip ? `clip-path:${l.clip};` : "");
      const img = `<img class="av-img" src="${url}" alt=""${css ? ` style="${css}"` : ""}>`;
      const tint = l.tint
        ? `<i class="av-tint" style="background:${l.color};opacity:${l.alpha};-webkit-mask-image:url(${url});mask-image:url(${url})"></i>`
        : "";
      // 切開的脖子下緣沒有線稿，用往下 0.6px 的淡陰影補一條邊線
      const edge = l.clip ? ` style="filter:drop-shadow(0 0.6px 0 rgba(120,80,60,0.55))"` : "";
      return `<span class="av-layer"${tf || edge}>${img}${tint}</span>`;
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
