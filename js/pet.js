// pet.js — 貓咪小屋（首頁）：養成、圖鑑、稱號、紀念日、節日活動、互動屋，以及各小遊戲共用的過關獎勵
import { audio } from "../audio.js";
import { CatHouseController, CAT_BREEDS, facePos } from "../cathouse.js";
import { $, LS, localDay, escapeHtml, hideSheet, playSkinArrivalSound } from "./ui.js";
import { setSkin } from "./meowdoku.js";

const FOODS = {
  fish: { icon: "🐟", name: "小魚乾", affection: 4, mood: 4 },
  chicken: { icon: "🍗", name: "雞肉條", affection: 7, mood: 6 },
  tuna: { icon: "🥫", name: "鮪魚罐罐", affection: 11, mood: 9 },
  premium: { icon: "🍰", name: "豪華貓點心", affection: 18, mood: 14 },
};
const PET_LEVELS = [0, 20, 55, 105, 170, 250, 350, 470, 610, 770];
const STARTER_CATS = ["0", "1", "2", "4", "5", "6", "8", "9", "10", "12"];
const UNLOCK_WINS = {
  3: 2,
  7: 3,
  11: 4,
  15: 5,
  20: 7,
  25: 9,
  30: 12,
  35: 15,
  40: 18,
  45: 22,
  50: 26,
  55: 30,
  60: 36,
  65: 42,
  70: 50,
  75: 60,
  80: 75,
};
const GROWTH_STAGES = [
  { name: "幼貓", icon: "🐾", min: 0 },
  { name: "探索期", icon: "🌱", min: 35 },
  { name: "成長期", icon: "🌿", min: 105 },
  { name: "成熟期", icon: "🌟", min: 250 },
  { name: "傳奇夥伴", icon: "👑", min: 470 },
];
let collectionFilter = "all",
  collectionSort = "index";
function growthStage(value = petAffection()) {
  let stage = GROWTH_STAGES[0],
    index = 0;
  GROWTH_STAGES.forEach((x, i) => {
    if (value >= x.min) {
      stage = x;
      index = i;
    }
  });
  return { ...stage, index };
}
const TITLE_RULES = [
  {
    name: "初次搭檔",
    label: "與貓咪合作完成 1 關",
    value: (k) => petRecord(k).total,
    target: 1,
  },
  {
    name: "解謎新星",
    label: "完成 10 關簡單難度",
    value: (k) => petRecord(k).easy,
    target: 10,
  },
  {
    name: "邏輯高手",
    label: "完成 10 關普通難度",
    value: (k) => petRecord(k).normal,
    target: 10,
  },
  {
    name: "困難征服者",
    label: "完成 5 關困難難度",
    value: (k) => petRecord(k).hard,
    target: 5,
  },
  {
    name: "謎題大師",
    label: "完成 20 關困難難度",
    value: (k) => petRecord(k).hard,
    target: 20,
  },
  {
    name: "每日守護者",
    label: "完成 7 次每日挑戰",
    value: (k) => petRecord(k).daily,
    target: 7,
  },
  {
    name: "晨星旅伴",
    label: "完成 30 次每日挑戰",
    value: (k) => petRecord(k).daily,
    target: 30,
  },
  {
    name: "百戰夥伴",
    label: "累積合作完成 50 關",
    value: (k) => petRecord(k).total,
    target: 50,
  },
  {
    name: "傳奇拍檔",
    label: "累積合作完成 100 關",
    value: (k) => petRecord(k).total,
    target: 100,
  },
  { name: "心靈相通", label: "好感度達到 250", value: (k) => petAffection(k), target: 250 },
  { name: "永恆羈絆", label: "好感度達到 470", value: (k) => petAffection(k), target: 470 },
  { name: "幸福滿滿", label: "心情達到 90", value: (k) => petMoodValue(k), target: 90 },
];
function titleConditionsHtml(key) {
  return `<details class="title-panel"><summary>查看稱號解鎖條件</summary><div class="title-condition-list">${TITLE_RULES.map(
    (rule) => {
      const value = Math.min(rule.value(key), rule.target),
        done = value >= rule.target,
        percent = Math.min(100, (value / rule.target) * 100);
      return `<div class="title-condition ${done ? "unlocked" : "locked"}"><span><b>${done ? "✓" : "🔒"} ${rule.name}</b><small>${rule.label}</small></span><span class="title-state">${value}/${rule.target}</span><span class="title-progress"><i style="--title-progress:${percent}%"></i></span></div>`;
    },
  ).join("")}</div></details>`;
}
function knownGrowthStage(key) {
  return Number(petData.growthStages?.[key] ?? growthStage(petAffection(key)).index);
}
export function syncGrowthStages() {
  petData.growthStages = petData.growthStages || {};
  for (const key of petData.unlocked) {
    if (petData.growthStages[key] === undefined)
      petData.growthStages[key] = growthStage(petAffection(key)).index;
  }
  savePetData();
}
function checkGrowthUpgrade(key, beforeIndex) {
  const after = growthStage(petAffection(key));
  petData.growthStages = petData.growthStages || {};
  petData.growthStages[key] = after.index;
  savePetData();
  if (after.index > beforeIndex) setTimeout(() => showGrowthUpgrade(key, after), 120);
}
function showGrowthUpgrade(key, stage) {
  const layer = document.createElement("div");
  layer.className = "growth-up-overlay";
  layer.innerHTML = `<button class="growth-skip" type="button">跳過</button><div class="growth-up-card">${petFaceHtml(key, "growth-up-cat face")}<div class="growth-up-stage">${stage.icon} 成長為「${stage.name}」</div><div class="growth-up-title">${escapeHtml(petName(key))} 的羈絆更深了！</div></div>${[...Array(12)].map((_, i) => `<span class="growth-spark" style="--a:${i * 30}deg">${i % 2 ? "✨" : "⭐"}</span>`).join("")}`;
  document.body.append(layer);
  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    layer.classList.add("skipping");
    setTimeout(() => layer.remove(), 170);
  };
  layer.querySelector(".growth-skip").addEventListener("click", remove, { once: true });
  playSkinArrivalSound();
  navigator.vibrate?.([25, 30, 35]);
  setTimeout(remove, 2050);
}
function earnedTitles(key = activePetKey()) {
  const rec = petRecord(key),
    aff = petAffection(key),
    mood = petMoodValue(key),
    titles = [];
  if (rec.total >= 1) titles.push("初次搭檔");
  if (rec.easy >= 10) titles.push("解謎新星");
  if (rec.normal >= 10) titles.push("邏輯高手");
  if (rec.hard >= 5) titles.push("困難征服者");
  if (rec.hard >= 20) titles.push("謎題大師");
  if (rec.daily >= 7) titles.push("每日守護者");
  if (rec.daily >= 30) titles.push("晨星旅伴");
  if (rec.total >= 50) titles.push("百戰夥伴");
  if (rec.total >= 100) titles.push("傳奇拍檔");
  if (aff >= 250) titles.push("心靈相通");
  if (aff >= 470) titles.push("永恆羈絆");
  if (mood >= 90) titles.push("幸福滿滿");
  return titles.length ? titles : ["初來乍到"];
}
function primaryTitle(key = activePetKey()) {
  const list = earnedTitles(key),
    equipped = petData.equippedTitles?.[key];
  return equipped && list.includes(equipped) ? equipped : list[list.length - 1];
}
function growthTrackHtml(key) {
  const current = growthStage(petAffection(key)).index;
  return `<div class="growth-track">${GROWTH_STAGES.map((g, i) => `<div class="growth-step${i <= current ? " done" : ""}${i === current ? " current" : ""}"><span class="growth-icon">${g.icon}</span>${g.name}</div>`).join("")}</div>`;
}

export let petData = loadPetData();
collectionFilter = petData.collectionFilter || "all";
collectionSort = petData.collectionSort || "index";
function defaultPetData() {
  return {
    initialized: false,
    food: { fish: 0, chicken: 0, tuna: 0, premium: 0 },
    affection: {},
    mood: {},
    names: {},
    selected: null,
    unlocked: [],
    wins: 0,
    records: {},
    dailyFeedDate: null,
    interactDate: null,
    interactions: 0,
    collectionFilter: "all",
    collectionSort: "index",
    growthStages: {},
    birthdays: {},
    anniversaries: {},
    petView: "home",
    equippedTitles: {},
    reminderSeen: {},
    unlockedCostumes: ["default"],
    equippedCostumes: {},
    eventProgress: {},
    eventClaims: {},
  };
}
function loadPetData() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS.pet) || "null"),
      d = defaultPetData();
    if (raw) {
      Object.assign(d, raw);
      d.food = { ...defaultPetData().food, ...raw.food };
      d.affection = { ...raw.affection };
      d.mood = { ...raw.mood };
      d.names = { ...raw.names };
      d.records = { ...raw.records };
      d.unlocked = [...(raw.unlocked || [])];
      d.growthStages = { ...(raw.growthStages || {}) };
      d.collectionFilter = raw.collectionFilter || "all";
      d.collectionSort = raw.collectionSort || "index";
      d.birthdays = { ...(raw.birthdays || {}) };
      d.anniversaries = { ...(raw.anniversaries || {}) };
      d.petView = raw.petView || "home";
      d.equippedTitles = { ...(raw.equippedTitles || {}) };
      d.reminderSeen = { ...(raw.reminderSeen || {}) };
      d.unlockedCostumes = [...(raw.unlockedCostumes || ["default"])];
      if (!d.unlockedCostumes.includes("default")) d.unlockedCostumes.unshift("default");
      d.equippedCostumes = { ...(raw.equippedCostumes || {}) };
      d.eventProgress = { ...(raw.eventProgress || {}) };
      d.eventClaims = { ...(raw.eventClaims || {}) };
    }
    return d;
  } catch {
    return defaultPetData();
  }
}
function savePetData() {
  try {
    localStorage.setItem(LS.pet, JSON.stringify(petData));
  } catch {}
}
function activePetKey() {
  return String(petData.selected ?? "0");
}
function petName(key = activePetKey()) {
  return petData.names[key] || `貓咪 ${Number(key) + 1}`;
}
function petAffection(key = activePetKey()) {
  return Number(petData.affection[key] || 0);
}
function petMoodValue(key = activePetKey()) {
  return Math.max(0, Math.min(100, Number(petData.mood[key] ?? 65)));
}
function moodInfo(value = petMoodValue()) {
  if (value >= 85) return { icon: "😻", label: "超開心" };
  if (value >= 65) return { icon: "😺", label: "心情很好" };
  if (value >= 40) return { icon: "😸", label: "還不錯" };
  if (value >= 20) return { icon: "😿", label: "有點寂寞" };
  return { icon: "🙀", label: "需要陪伴" };
}
function petLevel(value = petAffection()) {
  let level = 1;
  for (let i = 1; i < PET_LEVELS.length; i++) if (value >= PET_LEVELS[i]) level = i + 1;
  return level;
}
function affectionProgress(value = petAffection()) {
  const level = petLevel(value),
    start = PET_LEVELS[level - 1] || 0,
    end = PET_LEVELS[level] ?? start + 200;
  return Math.max(0, Math.min(100, ((value - start) / (end - start)) * 100));
}
function petFaceHtml(key, cls = "pet-avatar") {
  const k = Math.max(0, Math.min(80, Number(key) || 0));
  return `<i class="${cls} face" style="background-position:${facePos(k)}"></i>`;
}
function isUnlocked(key) {
  return petData.unlocked.includes(String(key));
}
function refreshUnlocks() {
  for (const [k, wins] of Object.entries(UNLOCK_WINS))
    if (petData.wins >= wins && !isUnlocked(k)) petData.unlocked.push(String(k));
}
export function showStarterSetup() {
  let selected = STARTER_CATS[0];
  $("overlayTitle").textContent = "🐾 領養第一隻貓";
  $("overlayBody").innerHTML =
    `<p class="starter-intro">一開始只能選擇一隻夥伴。完成關卡、累積合作紀錄後，會陸續認識更多貓咪。</p><div class="starter-cats">${STARTER_CATS.map((k) => `<button class="starter-cat${k === selected ? " selected" : ""}" data-starter="${k}">${petFaceHtml(k, "face")}<span class="starter-name">候選貓咪 ${Number(k) + 1}</span></button>`).join("")}</div><label class="name-field"><span>替貓咪取名字</span><input id="starterName" maxlength="12" placeholder="輸入 1～12 個字" autocomplete="off"></label>`;
  const primary = $("overlayPrimary");
  primary.textContent = "開始一起冒險";
  primary.onclick = () => {
    const input = $("starterName"),
      name = input.value.trim();
    if (!name) {
      input.focus();
      input.style.borderColor = "var(--warn)";
      return;
    }
    petData.initialized = true;
    petData.selected = selected;
    petData.unlocked = [selected];
    petData.names[selected] = name;
    petData.affection[selected] = 0;
    petData.mood[selected] = 72;
    petData.anniversaries[selected] = localDay();
    petData.petView = "home";
    savePetData();
    hideSheet();
    setSkin(selected);
    showPetHome();
  };
  $("overlaySecondary").style.display = "none";
  $("overlay").classList.remove("hidden");
  $("overlayBody").onclick = (e) => {
    const b = e.target.closest("[data-starter]");
    if (!b) return;
    selected = b.dataset.starter;
    $("overlayBody")
      .querySelectorAll(".starter-cat")
      .forEach((x) => x.classList.toggle("selected", x === b));
  };
}
function petRecord(key = activePetKey()) {
  return { total: 0, easy: 0, normal: 0, hard: 0, daily: 0, quiz: 0, ...petData.records[key] };
}
// 所有小遊戲過關都走這裡：record 是 petRecord 的欄位（easy/normal/hard/daily/quiz）
export function awardWin({ record, rolls, pool, affection }) {
  const gained = {};
  for (let i = 0; i < rolls; i++) {
    const type = pool[Math.floor(Math.random() * pool.length)];
    petData.food[type] = (petData.food[type] || 0) + 1;
    gained[type] = (gained[type] || 0) + 1;
  }
  const key = activePetKey(),
    beforeStage = growthStage(petAffection(key)).index,
    gain = affection;
  petData.affection[key] = (petData.affection[key] || 0) + gain;
  petData.mood[key] = Math.min(100, petMoodValue(key) + 5);
  petData.wins++;
  const rec = petRecord(key);
  rec.total++;
  rec[record]++;
  petData.records[key] = rec;
  const before = new Set(petData.unlocked);
  refreshUnlocks();
  const unlocked = petData.unlocked.filter((k) => !before.has(k));
  savePetData();
  checkGrowthUpgrade(key, beforeStage);
  return { gained, key, affection: gain, unlocked };
}
export function rewardHtml(r) {
  return `<div class="reward-box"><b>🎁 過關獎勵</b><div class="reward-foods">${Object.entries(
    r.gained,
  )
    .map(
      ([k, v]) => `<span class="reward-food">${FOODS[k].icon} ${FOODS[k].name} ×${v}</span>`,
    )
    .join(
      "",
    )}</div><div style="margin-top:7px">💕 ${escapeHtml(petName(r.key))} 好感度 +${r.affection}</div>${r.unlocked.length ? `<div style="margin-top:7px">✨ 新認識 ${r.unlocked.length} 隻貓咪！</div>` : ""}</div>`;
}
function dailyFeedAvailable() {
  return petData.dailyFeedDate !== localDay();
}
function claimDailyFeed() {
  if (!dailyFeedAvailable()) return;
  const key = activePetKey(),
    beforeStage = growthStage(petAffection(key)).index;
  petData.dailyFeedDate = localDay();
  petData.food.fish = (petData.food.fish || 0) + 1;
  petData.affection[key] = (petData.affection[key] || 0) + 5;
  petData.mood[key] = Math.min(100, petMoodValue(key) + 10);
  savePetData();
  checkGrowthUpgrade(key, beforeStage);
  playSkinArrivalSound();
  navigator.vibrate?.([15, 20, 20]);
  showPetHome();
  requestAnimationFrame(() => animatePet("pet-bounce", "今天也要一起加油！"));
}
function dateParts(dateText) {
  if (!dateText) return null;
  const parts = dateText.split("-").map(Number);
  return parts.length === 3 ? { year: parts[0], month: parts[1], day: parts[2] } : null;
}
function isSameMonthDay(dateText, date = new Date()) {
  const p = dateParts(dateText);
  return !!p && p.month === date.getMonth() + 1 && p.day === date.getDate();
}
function daysSince(dateText) {
  if (!dateText) return 0;
  const start = new Date(`${dateText}T00:00:00`),
    now = new Date();
  return Math.max(
    0,
    Math.floor(
      (new Date(now.getFullYear(), now.getMonth(), now.getDate()) - start) / 86400000,
    ),
  );
}
function nextSpecialDay(dateText) {
  const p = dateParts(dateText);
  if (!p) return null;
  const now = new Date(),
    today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let target = new Date(now.getFullYear(), p.month - 1, p.day);
  if (target < today) target = new Date(now.getFullYear() + 1, p.month - 1, p.day);
  return Math.ceil((target - today) / 86400000);
}
const FESTIVAL_COSTUMES = [
  {
    id: "default",
    name: "經典造型",
    icon: "🐱",
    desc: "貓咪原本的可愛模樣",
    permanent: true,
  },
  {
    id: "newyear",
    name: "新年限定",
    icon: "🧨",
    start: [1, 1],
    end: [1, 7],
    hat: "🧨",
    left: "🧧",
    right: "✨",
    desc: "完成新年活動任務解鎖",
  },
  {
    id: "lantern",
    name: "元宵限定",
    icon: "🏮",
    start: [2, 10],
    end: [2, 18],
    hat: "🏮",
    left: "✨",
    right: "🏮",
    desc: "完成元宵活動任務解鎖",
  },
  {
    id: "catday",
    name: "貓咪日限定",
    icon: "👑",
    start: [8, 1],
    end: [8, 10],
    hat: "👑",
    left: "🐾",
    right: "🐾",
    desc: "完成貓咪日活動任務解鎖",
  },
  {
    id: "halloween",
    name: "萬聖節限定",
    icon: "🎃",
    start: [10, 20],
    end: [10, 31],
    hat: "🎃",
    left: "🦇",
    right: "🍬",
    desc: "完成萬聖節活動任務解鎖",
  },
  {
    id: "christmas",
    name: "聖誕限定",
    icon: "🎅",
    start: [12, 15],
    end: [12, 31],
    hat: "🎅",
    left: "🎄",
    right: "🎁",
    desc: "完成聖誕活動任務解鎖",
  },
];
const EVENT_MISSIONS = [
  {
    id: "wins",
    icon: "🧩",
    name: "節日解謎",
    desc: "活動期間完成 3 關",
    target: 3,
    value: () => eventRecord().wins,
    reward: "🐟×2",
  },
  {
    id: "hard",
    icon: "⭐",
    name: "挑戰高手",
    desc: "完成 1 關普通或困難",
    target: 1,
    value: () => eventRecord().hard,
    reward: "🥫×1",
  },
  {
    id: "feed",
    icon: "🍗",
    name: "節日款待",
    desc: "餵食貓咪 3 次",
    target: 3,
    value: () => eventRecord().feed,
    reward: "🍗×2",
  },
  {
    id: "play",
    icon: "🧶",
    name: "歡樂互動",
    desc: "與貓咪互動 5 次",
    target: 5,
    value: () => eventRecord().play,
    reward: "💕+10",
  },
];
function monthDayNumber(month, day) {
  return month * 100 + day;
}
function activeFestival(date = new Date()) {
  const md = monthDayNumber(date.getMonth() + 1, date.getDate());
  return (
    FESTIVAL_COSTUMES.find(
      (f) => f.start && md >= monthDayNumber(...f.start) && md <= monthDayNumber(...f.end),
    ) || null
  );
}
function selectedCostume(key = activePetKey()) {
  const selected = petData.equippedCostumes?.[key];
  if (selected && petData.unlockedCostumes.includes(selected))
    return FESTIVAL_COSTUMES.find((f) => f.id === selected) || FESTIVAL_COSTUMES[0];
  const festival = activeFestival();
  if (festival && petData.unlockedCostumes.includes(festival.id)) return festival;
  return FESTIVAL_COSTUMES[0];
}
function festivalCostumeHtml(key = activePetKey()) {
  const f = selectedCostume(key);
  return f && f.id !== "default"
    ? `<span class="festival-costume"><span class="costume-hat">${f.hat}</span><span class="costume-left">${f.left}</span><span class="costume-right">${f.right}</span><span class="costume-label">${f.name}</span></span>`
    : "";
}
function festivalWrapClass(key = activePetKey()) {
  const f = selectedCostume(key);
  return f && f.id !== "default" ? ` festival-${f.id}` : "";
}
function festivalPreviewHtml(key = activePetKey()) {
  const f = selectedCostume(key),
    event = activeFestival();
  return `<div class="festival-preview"><span style="font-size:1.45rem">${f.icon}</span><span><b>${f.name}${f.id !== "default" ? "服裝展示中" : "造型"}</b><small>${event ? `目前活動：${event.name}。前往活動頁可解鎖限定服裝。` : "可在服裝圖鑑自由切換已收藏的造型。"}</small></span></div>`;
}

function isBirthdayToday(key) {
  return isSameMonthDay(petData.birthdays[key]);
}
function birthdayDressHtml(key) {
  return `${isBirthdayToday(key) ? '<span class="birthday-cape"></span><span class="birthday-hat"></span>' : ""}${festivalCostumeHtml(key)}`;
}
function petAvatarWrapClass(key) {
  return `pet-avatar-wrap${isBirthdayToday(key) ? " birthday-dress" : ""}${festivalWrapClass(key)}`;
}
function countdownText(days) {
  if (days === null) return "尚未設定";
  if (days === 0) return "就是今天！";
  if (days === 1) return "明天";
  return `${days} 天`;
}
function countdownPanelHtml(key) {
  const birthday = petData.birthdays[key],
    anniversary = petData.anniversaries[key],
    bd = nextSpecialDay(birthday),
    ad = nextSpecialDay(anniversary);
  return `<div class="countdown-panel"><div class="countdown-card"><span class="countdown-icon">🎂</span><span><b>${escapeHtml(petName(key))} 的生日</b><small>${birthday || "尚未設定日期"}</small></span><span class="countdown-days${bd === 0 ? " today" : ""}">${countdownText(bd)}</span></div><div class="countdown-card"><span class="countdown-icon">🎉</span><span><b>相遇紀念日</b><small>${anniversary ? `已陪伴 ${daysSince(anniversary)} 天` : "尚未設定日期"}</small></span><span class="countdown-days${ad === 0 ? " today" : ""}">${countdownText(ad)}</span></div><div class="reminder-note">🔔 倒數提醒會在紀念日頁面持續顯示；日期進入 7 天內時會標示為即將到來。${(bd !== null && bd <= 7) || (ad !== null && ad <= 7) ? '<span class="reminder-badge">即將到來</span>' : ""}</div></div>`;
}
function specialDayHtml(key) {
  const birthday = petData.birthdays[key],
    anniversary = petData.anniversaries[key],
    messages = [];
  if (isSameMonthDay(birthday))
    messages.push(`🎂 今天是 ${escapeHtml(petName(key))} 的生日！`);
  if (isSameMonthDay(anniversary))
    messages.push(`🎉 今天是相遇紀念日！已陪伴 ${daysSince(anniversary)} 天`);
  return messages.length ? `<div class="special-day">${messages.join("<br>")}</div>` : "";
}
function petSubnavHtml(view) {
  return `<div class="pet-subnav five"><button data-pet-view="home" class="${view === "home" ? "active" : ""}">🏠 貓咪小屋</button><button data-pet-view="titles" class="${view === "titles" ? "active" : ""}">🏅 稱號牆</button><button data-pet-view="dates" class="${view === "dates" ? "active" : ""}">🎂 紀念日</button><button data-pet-view="events" class="${view === "events" ? "active" : ""}">🎊 活動</button><button data-pet-view="room" class="${view === "room" ? "active" : ""}">🎮 互動屋</button></div>`;
}
function eventKey() {
  const f = activeFestival();
  return f ? `${new Date().getFullYear()}-${f.id}` : null;
}
function eventRecord() {
  const key = eventKey();
  if (!key) return { wins: 0, hard: 0, feed: 0, play: 0 };
  return { wins: 0, hard: 0, feed: 0, play: 0, ...petData.eventProgress[key] };
}
export function addEventProgress(type, amount = 1) {
  const key = eventKey();
  if (!key) return;
  petData.eventProgress[key] = eventRecord();
  petData.eventProgress[key][type] = (petData.eventProgress[key][type] || 0) + amount;
  savePetData();
}
function missionDone(m) {
  return Math.min(m.value(), m.target) >= m.target;
}
function allMissionsClaimed() {
  const key = eventKey();
  return key && EVENT_MISSIONS.every((m) => petData.eventClaims[`${key}:${m.id}`]);
}
function claimEventMission(id) {
  const event = activeFestival(),
    key = eventKey(),
    mission = EVENT_MISSIONS.find((m) => m.id === id);
  if (!event || !mission || !missionDone(mission) || petData.eventClaims[`${key}:${id}`]) return;
  petData.eventClaims[`${key}:${id}`] = true;
  if (id === "wins") petData.food.fish = (petData.food.fish || 0) + 2;
  if (id === "hard") petData.food.tuna = (petData.food.tuna || 0) + 1;
  if (id === "feed") petData.food.chicken = (petData.food.chicken || 0) + 2;
  if (id === "play")
    petData.affection[activePetKey()] = (petData.affection[activePetKey()] || 0) + 10;
  if (allMissionsClaimed() && !petData.unlockedCostumes.includes(event.id))
    petData.unlockedCostumes.push(event.id);
  savePetData();
  playSkinArrivalSound();
  navigator.vibrate?.([15, 20, 25]);
  showPetHome();
}
function equipCostume(id) {
  if (!petData.unlockedCostumes.includes(id)) return;
  petData.equippedCostumes[activePetKey()] = id;
  savePetData();
  playSkinArrivalSound();
  showPetHome();
  requestAnimationFrame(() => animatePet("pet-wiggle", "新造型好看嗎？"));
}
function costumeCollectionHtml(key) {
  const owned = FESTIVAL_COSTUMES.filter((c) =>
      petData.unlockedCostumes.includes(c.id),
    ).length,
    total = FESTIVAL_COSTUMES.length,
    percent = Math.round((owned / total) * 100),
    selected = selectedCostume(key);
  return `<div class="collection-progress"><div class="collection-progress-head"><span>👗 服裝收藏進度</span><span>${owned}/${total}</span></div><div class="collection-progress-bar"><i style="--collection-progress:${percent}%"></i></div><small>完成節日活動任務，即可永久收藏並在活動結束後繼續穿著。</small></div><div class="costume-collection">${FESTIVAL_COSTUMES.map(
    (c) => {
      const unlocked = petData.unlockedCostumes.includes(c.id),
        equipped = selected.id === c.id;
      return `<div class="costume-card${unlocked ? "" : " locked"}${equipped ? " equipped" : ""}"><span class="costume-thumb">${c.icon}</span><span><b>${c.name}</b><small>${c.desc}</small></span>${!unlocked ? '<span class="costume-lock">🔒</span>' : ""}${equipped ? '<span class="costume-equipped">穿著中</span>' : ""}${unlocked ? `<button data-equip-costume="${c.id}" ${equipped ? "disabled" : ""}>${equipped ? "✓ 目前穿著" : "換上服裝"}</button>` : ""}</div>`;
    },
  ).join("")}</div>`;
}
function eventPageHtml(key) {
  const event = activeFestival();
  if (!event)
    return `${petSubnavHtml("events")}<div class="no-event">目前沒有進行中的節日活動。<br>已收藏服裝仍可在下方自由切換。</div>${costumeCollectionHtml(key)}`;
  const eventId = eventKey();
  const missions = EVENT_MISSIONS.map((m) => {
    const value = Math.min(m.value(), m.target),
      done = value >= m.target,
      claimed = petData.eventClaims[`${eventId}:${m.id}`],
      percent = Math.min(100, (value / m.target) * 100);
    return `<div class="event-mission${done ? " done" : ""}"><span class="mission-icon">${m.icon}</span><span><b>${m.name}</b><small>${m.desc}・${value}/${m.target}</small><span class="mission-progress"><i style="--mission-progress:${percent}%"></i></span></span><span class="mission-reward">${m.reward}${done ? `<br><button data-claim-mission="${m.id}" ${claimed ? "disabled" : ""}>${claimed ? "已領取" : "領取"}</button>` : ""}</span></div>`;
  }).join("");
  const complete = allMissionsClaimed();
  return `${petSubnavHtml("events")}<div class="event-panel"><div class="event-hero"><span class="event-hero-icon">${event.icon}</span><span><b>${event.name}活動</b><small>完成全部任務即可永久收藏「${event.name}服裝」。${complete ? "服裝已解鎖，可於下方手動切換。" : ""}</small></span></div><div class="event-missions">${missions}</div>${costumeCollectionHtml(key)}</div>`;
}
function titleWallHtml(key) {
  const unlocked = new Set(earnedTitles(key)),
    cards = TITLE_RULES.map((rule, i) => {
      const value = Math.min(rule.value(key), rule.target),
        done = value >= rule.target,
        percent = Math.min(100, (value / rule.target) * 100);
      return `<div class="title-card ${done ? "unlocked" : "locked"}"><span class="title-medal">${done ? ["🏅", "🎖️", "🏆", "🌟"][i % 4] : "🔒"}</span><span><b>${rule.name}</b><small>${rule.label}<br>${value}/${rule.target}</small></span><span class="wall-progress"><i style="--p:${percent}%"></i></span>${done ? `<button class="title-equip" data-equip-title="${escapeHtml(rule.name)}" ${primaryTitle(key) === rule.name ? "disabled" : ""}>${primaryTitle(key) === rule.name ? "✓ 裝備中" : "裝備稱號"}</button>${primaryTitle(key) === rule.name ? '<span class="equipped-mark">使用中</span>' : ""}` : ""}</div>`;
    }).join("");
  return `${petSubnavHtml("titles")}<div class="title-wall-summary"><div class="title-wall-stat"><b>${unlocked.size}</b><small>已解鎖稱號</small></div><div class="title-wall-stat"><b>${TITLE_RULES.length - unlocked.size}</b><small>待解鎖</small></div><div class="title-wall-stat"><b>${Math.round((unlocked.size / TITLE_RULES.length) * 100)}%</b><small>完成度</small></div></div><div class="title-wall">${cards}</div>`;
}
function datesHtml(key) {
  const birthday = petData.birthdays[key] || "",
    anniversary = petData.anniversaries[key] || "",
    birthdayNext = nextSpecialDay(birthday),
    anniversaryDays = daysSince(anniversary);
  return `${petSubnavHtml("dates")}${specialDayHtml(key)}${countdownPanelHtml(key)}<div class="date-panel"><div class="date-card"><label>🎂 ${escapeHtml(petName(key))} 的生日<input id="petBirthday" type="date" value="${birthday}"></label><div class="date-note">${birthday ? (birthdayNext === 0 ? "今天就是生日！" : `距離下次生日還有 ${birthdayNext} 天`) : "設定生日後，每年當天會顯示生日祝福。"}</div></div><div class="date-card"><label>🎉 相遇紀念日<input id="petAnniversary" type="date" value="${anniversary}"></label><div class="date-note">${anniversary ? `已經一起冒險 ${anniversaryDays} 天。` : "預設為領養日，也可以自行調整。"}</div></div><div class="date-actions"><button data-save-dates class="primary">儲存日期</button><button data-clear-birthday>清除生日</button></div></div>`;
}
function equipTitle(title) {
  const key = activePetKey(),
    titles = earnedTitles(key);
  if (!titles.includes(title)) return;
  petData.equippedTitles = petData.equippedTitles || {};
  petData.equippedTitles[key] = title;
  savePetData();
  playSkinArrivalSound();
  navigator.vibrate?.(16);
  showPetHome();
}
function setPetView(view) {
  petData.petView = view;
  savePetData();
  showPetHome();
}
function savePetDates() {
  const key = activePetKey(),
    birthday = $("petBirthday")?.value || "",
    anniversary = $("petAnniversary")?.value || "";
  if (birthday) petData.birthdays[key] = birthday;
  else delete petData.birthdays[key];
  if (anniversary) petData.anniversaries[key] = anniversary;
  else delete petData.anniversaries[key];
  savePetData();
  showPetHome();
  requestAnimationFrame(() => animatePet("pet-bounce", "重要的日子記住了！"));
}
function clearPetBirthday() {
  delete petData.birthdays[activePetKey()];
  savePetData();
  showPetHome();
}
function claimSpecialDayBonus(key) {
  const today = localDay(),
    token = `${key}:${today}`;
  petData.reminderSeen = petData.reminderSeen || {};
  if (petData.reminderSeen[token]) return;
  let changed = false;
  if (isBirthdayToday(key)) {
    petData.food.premium = (petData.food.premium || 0) + 1;
    petData.affection[key] = (petData.affection[key] || 0) + 8;
    petData.mood[key] = Math.min(100, petMoodValue(key) + 15);
    changed = true;
  }
  if (isSameMonthDay(petData.anniversaries[key])) {
    petData.food.tuna = (petData.food.tuna || 0) + 1;
    petData.affection[key] = (petData.affection[key] || 0) + 5;
    changed = true;
  }
  if (changed) {
    petData.reminderSeen[token] = true;
    savePetData();
    setTimeout(() => animatePet("pet-bounce", "今天是特別的日子！"), 250);
  }
}
export function showPetHome() {
  if (!petData.initialized) return;
  const key = activePetKey(),
    view = petData.petView || "home";
  claimSpecialDayBonus(key);
  leavePetHome();
  if (view === "titles") return renderPetView(titleWallHtml(key));
  if (view === "dates") return renderPetView(datesHtml(key));
  if (view === "room") return showPetRoom();
  if (view === "events") return renderPetView(eventPageHtml(key));
  const aff = petAffection(key),
    level = petLevel(aff),
    progress = affectionProgress(aff),
    mood = moodInfo(),
    rec = petRecord(key),
    stage = growthStage(aff),
    titles = earnedTitles(key);
  let cats = [...Array(81)].map((_, i) => String(i));
  if (collectionFilter === "unlocked") cats = cats.filter(isUnlocked);
  else if (collectionFilter === "locked") cats = cats.filter((k) => !isUnlocked(k));
  else if (collectionFilter === "raised")
    cats = cats.filter((k) => isUnlocked(k) && petAffection(k) > 0);
  else if (collectionFilter.startsWith("stage-")) {
    const target = Number(collectionFilter.split("-")[1]);
    cats = cats.filter((k) => isUnlocked(k) && growthStage(petAffection(k)).index === target);
  }
  const sorters = {
    index: (a, b) => Number(a) - Number(b),
    name: (a, b) => petName(a).localeCompare(petName(b), "zh-Hant"),
    level: (a, b) =>
      petLevel(petAffection(b)) - petLevel(petAffection(a)) || Number(a) - Number(b),
    affection: (a, b) => petAffection(b) - petAffection(a) || Number(a) - Number(b),
    cooperation: (a, b) => petRecord(b).total - petRecord(a).total || Number(a) - Number(b),
    stage: (a, b) =>
      growthStage(petAffection(b)).index - growthStage(petAffection(a)).index ||
      petAffection(b) - petAffection(a),
  };
  cats.sort(sorters[collectionSort] || sorters.index);
  const body = `<div class="pet-home">${petSubnavHtml("home")}${festivalPreviewHtml(key)}${specialDayHtml(key)}<div class="pet-hero" id="petHero"><div class="${petAvatarWrapClass(key)}">${birthdayDressHtml(key)}${petFaceHtml(key)}<span class="pet-speech" id="petSpeech"></span></div><div><div class="pet-name">${escapeHtml(petName(key))}　Lv.${level}</div><div class="growth-badges"><span class="growth-badge">${stage.icon} ${stage.name}</span><span class="title-badge" title="前往稱號牆可更換">🏅 ${primaryTitle(key)}・已裝備</span></div><div class="title-list">${titles
    .slice(-4)
    .map((t) => `<span class="mini-title">${t}</span>`)
    .join(
      "",
    )}</div>${titleConditionsHtml(key)}<div class="mood-row"><span class="mood-pill">${mood.icon} ${mood.label}</span><span>心情 ${petMoodValue(key)}/100</span></div><div class="affection-bar"><div class="affection-fill" style="--affection:${progress}%"></div></div><div class="pet-affection">💕 好感度 ${aff}${level < PET_LEVELS.length ? `／${PET_LEVELS[level]}` : "（最高等級）"}</div>${growthTrackHtml(key)}<div class="rename-row"><input id="renameInput" maxlength="12" value="${escapeHtml(petName(key))}"><button data-rename>改名</button></div></div></div><div class="daily-feed"><span><b>📅 每日餵食獎勵</b><small>${dailyFeedAvailable() ? "今天可領取小魚乾與好感度" : "今天已經領過了"}</small></span><button data-daily-feed ${dailyFeedAvailable() ? "" : "disabled"}>${dailyFeedAvailable() ? "領取" : "已領取"}</button></div><div class="interaction-row"><button data-interact="pet">👋 摸摸</button><button data-interact="play">🧶 玩耍</button><button data-interact="rest">💤 休息</button></div><div class="pet-stats"><div class="pet-stat"><b>${rec.total}</b><small>合作關卡</small></div><div class="pet-stat"><b>${rec.easy}/${rec.normal}/${rec.hard}</b><small>簡單／普通／困難</small></div><div class="pet-stat"><b>${rec.daily}</b><small>每日挑戰</small></div><div class="pet-stat"><b>${rec.quiz}</b><small>問答過關</small></div></div><div class="food-grid">${Object.entries(
    FOODS,
  )
    .map(
      ([id, f]) =>
        `<button class="food-card" data-feed="${id}" ${(petData.food[id] || 0) <= 0 ? "disabled" : ""}><span class="food-icon">${f.icon}</span><span class="food-info"><b>${f.name}</b><small>好感度 +${f.affection}</small></span><span class="food-count">×${petData.food[id] || 0}</span></button>`,
    )
    .join(
      "",
    )}</div><div class="pet-collection-title"><span>📖 貓咪圖鑑 ${petData.unlocked.length}/81</span><small>合作過關可認識新貓咪</small></div><div class="collection-tools"><label>篩選<select data-collection-filter><option value="all" ${collectionFilter === "all" ? "selected" : ""}>全部貓咪</option><option value="unlocked" ${collectionFilter === "unlocked" ? "selected" : ""}>已解鎖</option><option value="locked" ${collectionFilter === "locked" ? "selected" : ""}>未解鎖</option><option value="raised" ${collectionFilter === "raised" ? "selected" : ""}>培養中</option>${GROWTH_STAGES.map((g, i) => `<option value="stage-${i}" ${collectionFilter === `stage-${i}` ? "selected" : ""}>${g.icon} ${g.name}</option>`).join("")}</select></label><label>排序<select data-collection-sort><option value="index" ${collectionSort === "index" ? "selected" : ""}>圖鑑編號</option><option value="name" ${collectionSort === "name" ? "selected" : ""}>名稱</option><option value="stage" ${collectionSort === "stage" ? "selected" : ""}>成長階段</option><option value="level" ${collectionSort === "level" ? "selected" : ""}>等級高到低</option><option value="affection" ${collectionSort === "affection" ? "selected" : ""}>好感度高到低</option><option value="cooperation" ${collectionSort === "cooperation" ? "selected" : ""}>合作關卡多到少</option></select></label><div class="collection-saved-note">✓ 篩選與排序會自動保存</div></div><div class="pet-collection">${
    cats.length
      ? cats
          .map((k) => {
            const unlocked = isUnlocked(k),
              g = growthStage(petAffection(k));
            return `<button class="pet-cat${k === key ? " active" : ""}${unlocked ? "" : " locked"}" ${unlocked ? `data-pet-select="${k}"` : "disabled"} aria-label="${unlocked ? petName(k) : "尚未解鎖"}">${petFaceHtml(k, "face")}${unlocked ? `<span class="pet-cat-stage">${g.icon}</span><span class="pet-cat-level">Lv.${petLevel(petAffection(k))}</span><span class="pet-cat-title" title="裝備稱號：${escapeHtml(primaryTitle(k))}">🏅 ${escapeHtml(primaryTitle(k))}</span><span class="pet-cat-name">${escapeHtml(petName(k))}</span>` : '<span class="pet-lock">🔒</span>'}</button>`;
          })
          .join("")
      : '<div class="collection-empty">目前沒有符合條件的貓咪</div>'
  }</div></div>`;
  renderPetView(body);
}
function renderPetView(html) {
  $("petView").innerHTML = html;
}

// 互動屋：10 品種全身貓、撫摸／逗貓棒／貓砂盆／餵食，好感度獨立於貓咪小屋的養成系統
let catRoom = null;
export function leavePetHome() {
  catRoom?.close();
}
function showPetRoom() {
  renderPetView(`${petSubnavHtml("room")}<div id="catRoomMount"></div>`);
  catRoom ??= new CatHouseController({
    onSelectBreed: (bId) => {
      const idle = String(CAT_BREEDS[bId].frames.idle);
      if (!isUnlocked(idle)) return "這隻貓還沒解鎖，先多過幾關認識牠吧！🔒";
      petData.selected = idle;
      savePetData();
      setSkin(idle);
      return `已將${CAT_BREEDS[bId].name}設為謎題夥伴！🐾`;
    },
  });
  catRoom.mount($("catRoomMount"));
}
function animatePet(cls, text) {
  const avatar = document.querySelector(".pet-avatar");
  if (!avatar) return;
  avatar.classList.remove("pet-bounce", "pet-wiggle", "pet-sleep");
  void avatar.offsetWidth;
  avatar.classList.add(cls);
  const speech = $("petSpeech");
  if (speech) {
    speech.textContent = text;
    speech.classList.remove("show");
    void speech.offsetWidth;
    speech.classList.add("show");
  }
}
function interactPet(type) {
  addEventProgress("play", 1);
  const key = activePetKey(),
    beforeStage = growthStage(petAffection(key)).index,
    today = localDay();
  if (petData.interactDate !== today) {
    petData.interactDate = today;
    petData.interactions = 0;
  }
  const limited = petData.interactions >= 6;
  if (!limited) {
    petData.interactions++;
    petData.affection[key] = (petData.affection[key] || 0) + (type === "play" ? 2 : 1);
    petData.mood[key] = Math.min(
      100,
      petMoodValue(key) + (type === "play" ? 7 : type === "pet" ? 4 : 3),
    );
    savePetData();
    checkGrowthUpgrade(key, beforeStage);
  }
  if (!limited) audio.playMeow(type === "rest" ? 0.85 : 1.1);
  const data =
    type === "play"
      ? ["pet-wiggle", "再玩一次！"]
      : type === "rest"
        ? ["pet-sleep", "呼嚕呼嚕…"]
        : ["pet-bounce", "最喜歡你了！"];
  animatePet(data[0], limited ? "今天已經玩得很滿足了！" : data[1]);
}
function feedPet(type) {
  addEventProgress("feed", 1);
  const food = FOODS[type],
    key = activePetKey(),
    beforeStage = growthStage(petAffection(key)).index;
  if (!food || (petData.food[type] || 0) <= 0) return;
  petData.food[type]--;
  petData.affection[key] = (petData.affection[key] || 0) + food.affection;
  petData.mood[key] = Math.min(100, petMoodValue(key) + food.mood);
  savePetData();
  checkGrowthUpgrade(key, beforeStage);
  playSkinArrivalSound();
  navigator.vibrate?.(20);
  showPetHome();
  requestAnimationFrame(() => animatePet("pet-bounce", `${food.name}真好吃！`));
}
function selectPet(key) {
  if (!isUnlocked(key)) return;
  petData.selected = String(key);
  savePetData();
  setSkin(String(key));
  showPetHome();
}
function renamePet() {
  const input = $("renameInput"),
    name = input?.value.trim();
  if (!name) return;
  petData.names[activePetKey()] = name.slice(0, 12);
  savePetData();
  showPetHome();
  requestAnimationFrame(() => animatePet("pet-wiggle", `我叫${name.slice(0, 12)}！`));
}

$("petView").addEventListener("change", (e) => {
  const filter = e.target.closest("[data-collection-filter]");
  if (filter) {
    collectionFilter = filter.value;
    petData.collectionFilter = collectionFilter;
    savePetData();
    showPetHome();
    return;
  }
  const sort = e.target.closest("[data-collection-sort]");
  if (sort) {
    collectionSort = sort.value;
    petData.collectionSort = collectionSort;
    savePetData();
    showPetHome();
  }
});
$("petView").addEventListener("click", (e) => {
  const mission = e.target.closest("[data-claim-mission]");
  if (mission) {
    claimEventMission(mission.dataset.claimMission);
    return;
  }
  const costume = e.target.closest("[data-equip-costume]");
  if (costume) {
    equipCostume(costume.dataset.equipCostume);
    return;
  }
  const equip = e.target.closest("[data-equip-title]");
  if (equip) {
    equipTitle(equip.dataset.equipTitle);
    return;
  }
  const view = e.target.closest("[data-pet-view]");
  if (view) {
    setPetView(view.dataset.petView);
    return;
  }
  const saveDates = e.target.closest("[data-save-dates]");
  if (saveDates) {
    savePetDates();
    return;
  }
  const clearBirthday = e.target.closest("[data-clear-birthday]");
  if (clearBirthday) {
    clearPetBirthday();
    return;
  }
  const daily = e.target.closest("[data-daily-feed]");
  if (daily) {
    claimDailyFeed();
    return;
  }
  const interact = e.target.closest("[data-interact]");
  if (interact) {
    interactPet(interact.dataset.interact);
    return;
  }
  const rename = e.target.closest("[data-rename]");
  if (rename) {
    renamePet();
    return;
  }
  const feed = e.target.closest("[data-feed]");
  if (feed) {
    feedPet(feed.dataset.feed);
    return;
  }
  const pet = e.target.closest("[data-pet-select]");
  if (pet) {
    selectPet(pet.dataset.petSelect);
    return;
  }
});
