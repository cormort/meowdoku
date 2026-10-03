// trip.js — 帶貓咪出門玩：公園散步、咖啡廳、逛街、看電影、海邊、溫泉旅行
// 每次出門拍一張相片（場景底圖 + 該品種立繪合成）收進相簿；相簿是這裡的主要收藏。
import { audio } from "../audio.js";
import { activePetKey, checkGrowthUpgrade, growthStage, petAffection, petCoins, petData, petMoodValue, petName, petStatus, petSubnavHtml, savePetData, updatePetHeroStats, updatePetStatus } from "./pet.js";
import { getRoomCatSprite, setRoomCatPose } from "./room.js";
import { $, escapeHtml, localDay, showSheet } from "./ui.js";
const HOUR = 3600e3;
export const TRIP_MIN_ENERGY = 25;
export const MAX_ALBUM = 30;
// cost＝金幣；energy＝消耗體力；clean＝清潔度增減；photoPose＝相片裡要用哪個姿勢立繪
export const TRIPS = [
  {
    id: "park",
    name: "公園散步",
    icon: "🌳",
    scene: "park",
    cost: 0,
    energy: 15,
    clean: -8,
    aff: 3,
    mood: 6,
    cool: 1 * HOUR,
    photoPose: "walk",
    lines: ["沿著池塘走了一圈，追了兩隻蝴蝶。", "在草皮上曬太陽，翻肚肚打滾。", "遇到別的貓，隔著欄杆互看很久。"],
  },
  {
    id: "cafe",
    name: "咖啡廳",
    icon: "☕",
    scene: "cafe",
    cost: 60,
    energy: 15,
    clean: -4,
    aff: 6,
    mood: 8,
    cool: 2 * HOUR,
    photoPose: "idle",
    lines: ["蹲在窗邊看路人，被說很可愛。", "偷舔了一口鮮奶油（不可以喔）。", "在沙發上睡著，醒來發現被蓋了小毯子。"],
  },
  {
    id: "shopping",
    name: "逛街購物",
    icon: "🛍️",
    scene: "street",
    cost: 90,
    energy: 20,
    clean: -6,
    aff: 8,
    mood: 10,
    cool: 2.5 * HOUR,
    photoPose: "walk",
    lines: ["買了一條新項圈，走路有風。", "在寵物店門口跟店貓對峙了三秒。", "提著紙袋回家，袋子比貓還大。"],
  },
  {
    id: "movie",
    name: "看電影",
    icon: "🎬",
    scene: "cinema",
    cost: 120,
    energy: 20,
    clean: -4,
    aff: 10,
    mood: 12,
    cool: 3 * HOUR,
    photoPose: "eat",
    lines: ["爆米花吃光光，一粒都沒留給我。", "演到感人處，悄悄靠過來蹭手。", "看到一半在腿上睡著，劇情應該是錯過了。"],
  },
  {
    id: "beach",
    name: "海邊玩水",
    icon: "🏖️",
    scene: "beach",
    cost: 180,
    energy: 30,
    clean: -18,
    aff: 13,
    mood: 15,
    cool: 6 * HOUR,
    photoPose: "run",
    lines: ["追浪花追了半小時，全身都是沙。", "撿到一顆貝殼，堅持要帶回家。", "被浪嚇到彈起來，尾巴整根炸開。"],
  },
  {
    id: "onsen",
    name: "溫泉旅行",
    icon: "♨️",
    scene: "onsen",
    cost: 260,
    energy: 25,
    clean: 10,
    aff: 16,
    mood: 18,
    cool: 8 * HOUR,
    photoPose: "sleep",
    lines: ["泡到耳朵紅紅，瞇著眼呼嚕。", "在浴衣上滾來滾去，不肯起來。", "旅館晚餐一口氣吃完，還想再來一盤。"],
  },
];
const tripById = (id) => TRIPS.find((t) => t.id === id);
function tripLog(key = activePetKey()) {
  petData.trips = petData.trips || {};
  petData.trips[key] = petData.trips[key] || {};
  return petData.trips[key];
}
export function tripAlbum() {
  petData.album = petData.album || [];
  return petData.album;
}
export function tripCooldown(id, key = activePetKey()) {
  const rec = tripLog(key)[id];
  const t = tripById(id);
  if (!rec?.lastAt || !t) return 0;
  return Math.max(0, rec.lastAt + t.cool - Date.now());
}
function fmtLeft(ms) {
  const m = Math.ceil(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)} 小時 ${m % 60} 分` : `${m} 分`;
}
function photoHtml(p, i = 0) {
  const t = tripById(p.id);
  if (!t) return "";
  return `<figure class="trip-photo" style="--scene:url(./icons/scenes/${t.scene}.webp);--tilt:${(((i % 3) - 1) * 0.7).toFixed(1)}deg">
    <div class="trip-shot"><img class="trip-cat" src="${getRoomCatSprite(p.key, t.photoPose)}" alt="${escapeHtml(p.catName || "")}" onerror="this.onerror=null;this.src=this.src.replace('.webp','.png')"></div>
    <figcaption><b>${t.icon} ${t.name}</b><small>${escapeHtml(p.caption)}</small><em>${escapeHtml(p.catName || "")}・${escapeHtml(p.day || "")}</em></figcaption>
  </figure>`;
}
export function tripPageHtml(key = activePetKey()) {
  const st = petStatus(key),
    coins = petCoins(),
    log = tripLog(key),
    album = tripAlbum(),
    done = TRIPS.reduce((n, t) => n + (log[t.id]?.count || 0), 0),
    tired = st.energy < TRIP_MIN_ENERGY,
    sick = !!st.sick;
  const cards = TRIPS.map((t) => {
    const cd = tripCooldown(t.id, key),
      rec = log[t.id] || { count: 0 },
      poor = coins < t.cost,
      blocked = cd > 0 || poor || tired || sick;
    const why =
      cd > 0
        ? `⏳ ${fmtLeft(cd)}後可以再去`
        : sick
          ? "😿 生病中，先休息"
          : tired
            ? `⚡ 體力不足（需 ${TRIP_MIN_ENERGY}）`
            : poor
              ? "🪙 金幣不足"
              : `${t.cost ? `🪙 ${t.cost}・` : ""}⚡ ${t.energy}・💕 +${t.aff}・😺 +${t.mood}`;
    return `<button class="trip-card${blocked ? " locked" : ""}" ${blocked ? "disabled" : `data-trip="${t.id}"`} aria-label="${t.name}">
      <span class="trip-thumb" style="--scene:url(./icons/scenes/${t.scene}.webp)"><i>${t.icon}</i></span>
      <span class="trip-info"><b>${t.name}</b><small>${why}</small></span>
      <span class="trip-count">${rec.count ? `去過 ${rec.count} 次` : "還沒去過"}</span>
    </button>`;
  }).join("");
  const photos = album.length
    ? album
        .slice()
        .reverse()
        .map((p, i) => photoHtml(p, i))
        .join("")
    : `<p class="trip-empty">相簿還是空的，帶 ${escapeHtml(petName(key))} 出門走走吧！</p>`;
  return `${petSubnavHtml("trip")}<div class="trip-panel">
    <div class="trip-hero"><b>🎒 帶 ${escapeHtml(petName(key))} 出門</b><small>🪙 ${coins}・⚡ 體力 ${Math.round(st.energy)}・這隻貓出門 ${done} 次</small></div>
    <div class="trip-list">${cards}</div>
    <div class="trip-album-title"><span>📸 相簿 ${album.length} 張</span><small>每次出門都會拍一張</small></div>
    <div class="trip-album">${photos}</div>
  </div>`;
}
export function startTrip(id, key = activePetKey()) {
  const t = tripById(id);
  if (!t) return;
  const st = petStatus(key),
    cd = tripCooldown(id, key),
    name = petName(key);
  if (st.sick) return showSheet("😿 先休息", `${name}現在生病中，看完醫生再出門吧。`, "知道了");
  if (st.energy < TRIP_MIN_ENERGY) return showSheet("⚡ 沒電了", `體力不足（需 ${TRIP_MIN_ENERGY}），先餵點東西或讓${name}休息一下。`, "知道了");
  if (cd > 0) return showSheet("⏳ 才剛回來", `${fmtLeft(cd)}之後再帶${name}去${t.name}吧。`, "知道了");
  if (petCoins() < t.cost) return showSheet("🪙 金幣不足", `去${t.name}需要 ${t.cost} 金幣喵。`, "知道了");
  const beforeStage = growthStage(petAffection(key)).index;
  petData.coins = Math.max(0, petCoins() - t.cost);
  updatePetStatus(key, { energy: -t.energy, hunger: -8, cleanliness: t.clean });
  petData.affection[key] = Math.max(0, petAffection(key) + t.aff);
  petData.mood[key] = Math.max(0, Math.min(100, petMoodValue(key) + t.mood));
  checkGrowthUpgrade(key, beforeStage);
  const log = tripLog(key);
  log[id] = { count: (log[id]?.count || 0) + 1, lastAt: Date.now() };
  const caption = t.lines[Math.floor(Math.random() * t.lines.length)];
  const entry = { id, key, caption, catName: name, at: Date.now(), day: localDay() };
  const album = tripAlbum();
  album.push(entry);
  if (album.length > MAX_ALBUM) album.splice(0, album.length - MAX_ALBUM);
  savePetData();
  updatePetHeroStats(key);
  audio.playVictory?.();
  setRoomCatPose(t.photoPose, `${t.name}好玩！`, "", 3000);
  showPetHome();
  showSheet(
    `${t.icon} ${t.name}`,
    `<div class="trip-result">${photoHtml(entry)}</div><p class="trip-result-line">${escapeHtml(caption)}</p><p class="trip-result-gain">💕 好感度 +${t.aff}・😺 心情 +${t.mood}・⚡ 體力 -${t.energy}${t.cost ? `・🪙 -${t.cost}` : ""}</p>`,
    "收下照片",
  );
}
export function handleTripClick(e) {
  const b = e.target.closest("[data-trip]");
  if (!b) return false;
  e.preventDefault();
  startTrip(b.dataset.trip);
  return true;
}
