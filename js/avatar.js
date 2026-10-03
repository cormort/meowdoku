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

// ── 角色繪製（SVG）──
const SKIN_SHADOW = "rgba(0,0,0,0.08)";
export function renderAvatar(input, { size = 150, showBackpack = true } = {}) {
  const a = normalizeAvatar(input);
  const skin = partValue("skin", a.skin, "#ffe1c9");
  const hair = partValue("hairColor", a.hairColor, "#3a2f2a");
  const top = partValue("top", a.top, "#fff");
  const bottom = partValue("bottom", a.bottom, "#4a6fa5");
  const shoes = partValue("shoes", a.shoes, "#eee");
  const hat = partValue("hat", a.hat, "#e0574f");
  const acc = AVATAR_PARTS.accessory.find((o) => o.id === a.accessory) || { id: "none" };

  const H = {
    short: `<path d="M36 58c0-22 15-34 34-34s34 12 34 34c0-8-8-12-14-14-6 8-30 10-40 4-8 4-14 6-14 10z" fill="${hair}"/>`,
    bob: `<path d="M34 60c0-24 16-36 36-36s36 12 36 36v22c0 6-6 8-10 4 2-14 0-24-4-30-8 10-38 12-48 2-4 6-6 16-4 28-4 4-10 2-10-4z" fill="${hair}"/>`,
    twin: `<path d="M36 58c0-23 15-34 34-34s34 11 34 34c-2-10-8-16-16-18-8 10-36 10-44 0-6 4-8 10-8 18z" fill="${hair}"/><circle cx="28" cy="70" r="12" fill="${hair}"/><circle cx="112" cy="70" r="12" fill="${hair}"/>`,
    pony: `<path d="M36 58c0-23 15-34 34-34s34 11 34 34c-2-10-8-16-16-18-8 10-36 10-44 0-6 4-8 10-8 18z" fill="${hair}"/><path d="M104 52c10 4 16 14 14 26-2 10-8 16-14 18 6-14 6-30 0-44z" fill="${hair}"/>`,
    curly: `<path d="M34 56c0-22 16-34 36-34s36 12 36 34c0 8-4 12-8 12 2-10-2-18-8-22-3 8-12 12-20 12s-17-4-20-12c-6 4-10 12-8 22-4 0-8-4-8-12z" fill="${hair}"/><circle cx="38" cy="52" r="9" fill="${hair}"/><circle cx="102" cy="52" r="9" fill="${hair}"/><circle cx="70" cy="26" r="10" fill="${hair}"/>`,
    bowl: `<path d="M36 62c0-24 15-36 34-36s34 12 34 36z" fill="${hair}"/>`,
  }[a.hair];

  const tops = {
    tshirt: `<path d="M46 96h48v52H46z" fill="${top}" stroke="#0002" stroke-width="1"/><rect x="26" y="98" width="20" height="38" rx="9" fill="${top}"/><rect x="94" y="98" width="20" height="38" rx="9" fill="${top}"/>`,
    hoodie: `<path d="M44 94h52v56H44z" rx="8" fill="${top}"/><rect x="24" y="98" width="22" height="44" rx="10" fill="${top}"/><rect x="94" y="98" width="22" height="44" rx="10" fill="${top}"/><path d="M52 94c4-8 32-8 36 0z" fill="#fff6"/>`,
    shirt: `<path d="M46 96h48v52H46z" fill="${top}" stroke="#0002"/><path d="M62 96l8 10 8-10z" fill="#b9cbe0"/><rect x="26" y="98" width="20" height="42" rx="8" fill="${top}"/><rect x="94" y="98" width="20" height="42" rx="8" fill="${top}"/>`,
    sailor: `<path d="M46 96h48v52H46z" fill="${top}" stroke="#0002"/><path d="M52 96l18 14 18-14 6 8-24 16-24-16z" fill="#5d86d8"/><rect x="26" y="98" width="20" height="40" rx="8" fill="${top}"/><rect x="94" y="98" width="20" height="40" rx="8" fill="${top}"/>`,
    sweater: `<path d="M42 96h56v54H42z" fill="${top}"/><rect x="22" y="100" width="22" height="46" rx="10" fill="${top}"/><rect x="96" y="100" width="22" height="46" rx="10" fill="${top}"/><path d="M42 130h56" stroke="#0002"/>`,
    vest: `<path d="M50 96h40v52H50z" fill="${top}"/><path d="M46 96h8v52h-8zM86 96h8v52h-8z" fill="#fff"/>`,
  }[a.top];

  const bottoms = {
    jeans: `<path d="M48 148h44v40H48z" fill="${bottom}"/><path d="M69 148h4v40h-4z" fill="#0003"/>`,
    shorts: `<path d="M48 148h44v22H48z" fill="${bottom}"/><path d="M69 148h4v22h-4z" fill="#0003"/>`,
    skirt: `<path d="M46 146h48l10 40H36z" fill="${bottom}"/><path d="M52 150h36M50 158h40M48 166h44" stroke="#0002"/>`,
    pleat: `<path d="M46 146h48l14 58H32z" fill="${bottom}"/>`,
    sport: `<path d="M48 148h44v40H48z" fill="${bottom}"/><path d="M48 154h44" stroke="#fff8"/>`,
  }[a.bottom];

  const shoesSvg = {
    sneaker: `<rect x="44" y="186" width="26" height="14" rx="6" fill="${shoes}" stroke="#0002"/><rect x="70" y="186" width="26" height="14" rx="6" fill="${shoes}" stroke="#0002"/>`,
    boots: `<rect x="44" y="178" width="26" height="22" rx="5" fill="${shoes}"/><rect x="70" y="178" width="26" height="22" rx="5" fill="${shoes}"/>`,
    loafer: `<rect x="44" y="188" width="26" height="12" rx="4" fill="${shoes}"/><rect x="70" y="188" width="26" height="12" rx="4" fill="${shoes}"/>`,
    sandal: `<rect x="44" y="192" width="26" height="8" rx="3" fill="${shoes}"/><rect x="70" y="192" width="26" height="8" rx="3" fill="${shoes}"/><path d="M48 192v-8M64 192v-8M74 192v-8M90 192v-8" stroke="${shoes}" stroke-width="3"/>`,
    rainboot: `<rect x="44" y="180" width="27" height="20" rx="4" fill="${shoes}"/><rect x="69" y="180" width="27" height="20" rx="4" fill="${shoes}"/><path d="M44 188h27M69 188h27" stroke="#0002"/>`,
  }[a.shoes];

  const hats = {
    none: "",
    cap: `<path d="M38 40c0-16 14-26 32-26s32 10 32 26z" fill="${hat}"/><path d="M100 38h16c4 0 4 8 0 8h-16z" fill="${hat}"/>`,
    beanie: `<path d="M38 44c0-18 14-30 32-30s32 12 32 30z" fill="${hat}"/><rect x="34" y="40" width="72" height="10" rx="5" fill="${hat}" opacity="0.85"/>`,
    straw: `<ellipse cx="70" cy="42" rx="46" ry="9" fill="${hat}"/><path d="M46 42c0-16 10-26 24-26s24 10 24 26z" fill="${hat}"/><path d="M46 38h48" stroke="#0002"/>`,
    beret: `<ellipse cx="70" cy="36" rx="30" ry="13" fill="${hat}"/><circle cx="92" cy="26" r="4" fill="${hat}"/>`,
    bow: `<path d="M70 30l-16-8v16zM70 30l16-8v16z" fill="${hat}"/><circle cx="70" cy="30" r="4" fill="${hat}"/>`,
  }[a.hat];

  const accSvg = {
    none: "",
    glasses: `<circle cx="56" cy="66" r="11" fill="none" stroke="#333" stroke-width="2.5"/><circle cx="84" cy="66" r="11" fill="none" stroke="#333" stroke-width="2.5"/><path d="M67 66h6" stroke="#333" stroke-width="2.5"/>`,
    scarf: `<path d="M44 96c10 8 42 8 52 0v10c-10 8-42 8-52 0z" fill="#e0574f"/><path d="M92 104l6 22-10-2z" fill="#e0574f"/>`,
    backpack: `<rect x="34" y="104" width="72" height="42" rx="10" fill="#8a5a34"/><rect x="52" y="110" width="36" height="18" rx="6" fill="#b7834f"/>`,
    headphone: `<path d="M36 62a34 34 0 0 1 68 0" fill="none" stroke="#3a3a3a" stroke-width="6"/><rect x="28" y="58" width="14" height="22" rx="6" fill="#3a3a3a"/><rect x="98" y="58" width="14" height="22" rx="6" fill="#3a3a3a"/>`,
    badge: `<rect x="60" y="112" width="26" height="16" rx="3" fill="#fff" stroke="#c9a227"/><path d="M64 118h18M64 123h12" stroke="#c9a227" stroke-width="1.5"/>`,
  }[a.accessory];

  return `<svg class="avatar-svg" viewBox="0 0 140 210" width="${size}" height="${(size / 140) * 210}"
    xmlns="http://www.w3.org/2000/svg" role="img" aria-label="我的角色">
  <ellipse cx="70" cy="204" rx="40" ry="6" fill="rgba(0,0,0,0.08)"/>
  ${a.accessory === "backpack" && showBackpack ? accSvg : ""}
  <rect x="52" y="150" width="14" height="40" rx="7" fill="${skin}"/>
  <rect x="74" y="150" width="14" height="40" rx="7" fill="${skin}"/>
  ${shoesSvg}
  <path d="M46 150h48v6H46z" fill="${SKIN_SHADOW}"/>
  ${bottoms}
  <rect x="60" y="88" width="20" height="14" rx="6" fill="${skin}"/>
  ${tops}
  ${a.accessory === "none" ? `<rect x="26" y="136" width="20" height="16" rx="8" fill="${skin}"/><rect x="94" y="136" width="20" height="16" rx="8" fill="${skin}"/>` : `<rect x="26" y="136" width="20" height="16" rx="8" fill="${skin}"/><rect x="94" y="136" width="20" height="16" rx="8" fill="${skin}"/>`}
  <circle cx="70" cy="62" r="35" fill="${skin}"/>
  <circle cx="57" cy="66" r="4.5" fill="#2b2b2b"/>
  <circle cx="83" cy="66" r="4.5" fill="#2b2b2b"/>
  <circle cx="58.2" cy="64.8" r="1.5" fill="#fff"/>
  <circle cx="84.2" cy="64.8" r="1.5" fill="#fff"/>
  <circle cx="48" cy="76" r="6" fill="#f19a9a" opacity="0.45"/>
  <circle cx="92" cy="76" r="6" fill="#f19a9a" opacity="0.45"/>
  <path d="M64 80c3 3 9 3 12 0" fill="none" stroke="#b3604f" stroke-width="2.5" stroke-linecap="round"/>
  ${H}
  ${hats}
  ${a.accessory !== "backpack" ? accSvg : ""}
</svg>`;
}
export function avatarLabel(a) {
  const n = normalizeAvatar(a);
  const name = (key, id) => AVATAR_PARTS[key].find((o) => o.id === id)?.name || "";
  return `${name("hair", n.hair)}／${name("hairColor", n.hairColor)}／${name("top", n.top)}／${name("bottom", n.bottom)}／${name("shoes", n.shoes)}${n.hat !== "none" ? `／${name("hat", n.hat)}` : ""}${n.accessory !== "none" ? `／${name("accessory", n.accessory)}` : ""}`;
}
