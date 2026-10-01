// life.js — 電子雞式的貓咪生活：隨時間變化的需求、生病與看醫生、在客廳自己走動，以及需要玩家回應的隨機事件
import { audio } from "../audio.js";
import { handleDailyCare } from "./academy.js";
import {
  activePetKey,
  addCoins,
  checkGrowthUpgrade,
  growthStage,
  petAffection,
  petCoins,
  petData,
  petMoodValue,
  petQuickStatusBarHtml,
  petStatus,
  savePetData,
  showPetHome,
  updatePetHeroStats,
} from "./pet.js";
import { addLitterClump, setRoomCatPose, spawnRoomHeart } from "./room.js";
import { $, escapeHtml, showSheet } from "./ui.js";

// ---------- 需求隨時間變化 ----------
// 以「15 分鐘」為一步，用整數計算（顯示的百分比不會出現小數）；離線最多補算 24 小時
const STEP_MS = 15 * 60 * 1000,
  MAX_STEPS = 96;

export const ILLNESSES = {
  cold: { name: "感冒", icon: "🤧", cure: "pill", desc: "一直打噴嚏、流鼻水，精神不太好。" },
  stomach: { name: "腸胃炎", icon: "🤢", cure: "pill", desc: "肚子太餓又亂吃東西，腸胃不舒服。" },
  hairball: { name: "毛球症", icon: "🤮", cure: "paste", desc: "肚子裡卡了太多毛球，一直想吐。" },
  fever: { name: "發燒", icon: "🤒", cure: "shot", desc: "感冒太久沒治療，燒起來了！需要打針。" },
};
const CURES = {
  pill: { icon: "💊", name: "餵藥", cost: 80 },
  paste: { icon: "🌿", name: "餵化毛膏", cost: 60 },
  shot: { icon: "💉", name: "打針", cost: 150 },
};
const clamp = (v) => Math.max(0, Math.min(100, v));

// 每一步：餓一點、髒一點、體力慢慢回復；照顧不好就可能生病，拖太久會惡化
function lifeStep(key, rng) {
  const s = petStatus(key);
  s.hunger = clamp(s.hunger - 1);
  s.cleanliness = clamp(s.cleanliness - 1);
  if (!s.sick) s.energy = clamp(s.energy + 2);
  if (s.hunger < 20 || s.sick) petData.mood[key] = clamp(petMoodValue(key) - 1);
  if (s.sick) {
    if (s.sick.id === "cold" && Date.now() - s.sick.since > 24 * 3600 * 1000)
      s.sick = { id: "fever", since: Date.now() };
    return;
  }
  const risk =
    0.002 +
    (s.hunger < 25 ? 0.01 : 0) +
    (s.cleanliness < 30 ? 0.01 : 0) +
    (s.fatigue > 80 ? 0.008 : 0) +
    (s.hairballs || 0) * 0.004;
  if (rng() >= risk) return;
  const id =
    (s.hairballs || 0) >= 3 ? "hairball" : s.hunger < 25 ? "stomach" : "cold";
  s.sick = { id, since: Date.now() };
}

// 依經過時間補算；回傳是否有變化
export function applyLifeTime(now = Date.now(), rng = Math.random) {
  if (!petData.initialized) return false;
  const key = activePetKey();
  petData.lifeTick ??= now;
  const steps = Math.floor((now - petData.lifeTick) / STEP_MS);
  if (steps <= 0) return false;
  const wasSick = !!petStatus(key).sick;
  for (let i = 0; i < Math.min(steps, MAX_STEPS); i++) lifeStep(key, rng);
  petData.lifeTick += steps * STEP_MS;
  savePetData();
  if (!wasSick && petStatus(key).sick) onFallSick();
  return true;
}

export function sickInfo(key = activePetKey()) {
  const sick = petStatus(key).sick;
  return sick ? ILLNESSES[sick.id] : null;
}

// 數值變了就重畫小屋頂端的狀態列
function refreshStatusBar() {
  const bar = document.querySelector("#petView .pet-quick-status-bar");
  if (bar) bar.outerHTML = petQuickStatusBarHtml();
}

// ---------- 看醫生 ----------
function befriend(affection, mood) {
  const key = activePetKey(),
    before = growthStage(petAffection(key)).index;
  petData.affection[key] = Math.max(0, (petData.affection[key] || 0) + affection);
  petData.mood[key] = clamp(petMoodValue(key) + mood);
  savePetData();
  checkGrowthUpgrade(key, before);
  updatePetHeroStats(key);
}

function onFallSick() {
  const ill = sickInfo();
  if (!ill || !$("petRoomStage")) return;
  audio.playMeow(0.8);
  setRoomCatPose("sleep", `${ill.icon} 好像${ill.name}了…不太舒服喵`, "pet-sleep");
  syncSickBadge();
}

let pillPaid = false;
export function showClinic() {
  const ill = sickInfo();
  if (!ill) {
    showSheet("🏥 貓咪診所", "醫生說：健康得很！記得按時吃飯、保持乾淨、別太累喔。", "好的");
    return;
  }
  const cure = CURES[ill.cure];
  showSheet(
    `🏥 貓咪診所・${ill.icon} ${ill.name}`,
    `<div class="clinic-box"><p>${ill.desc}</p><button class="primary" data-life-event="treat">${cure.icon} ${cure.name}（🪙 ${pillPaid && ill.cure !== "shot" ? "已付費" : cure.cost}）</button><small>目前金幣 🪙 ${petCoins()}</small></div>`,
    "先不要",
  );
}

function treat() {
  const ill = sickInfo();
  if (!ill) return;
  const cure = CURES[ill.cure];
  if (!pillPaid) {
    if (petCoins() < cure.cost) {
      showSheet("金幣不足 🪙", `${cure.name}需要 ${cure.cost} 金幣喵！先去學院上課或數獨打工賺錢吧。`, "知道了");
      return;
    }
    addCoins(-cure.cost);
    pillPaid = true;
  }
  // 餵藥有機會被吐出來（不用再付錢，再試一次）；打針一定成功但貓咪會不開心
  if (ill.cure !== "shot" && Math.random() < 0.4) {
    audio.playError();
    navigator.vibrate?.(40);
    showSheet("呸！😾", `${cure.icon} 被吐出來了…再試一次吧！`, "再餵一次", treat, "等一下", () => {});
    return;
  }
  pillPaid = false;
  const s = petStatus(activePetKey());
  s.sick = null;
  if (ill.cure === "paste") s.hairballs = 0;
  savePetData();
  if (ill.cure === "shot") {
    audio.playMeow(0.7);
    befriend(-2, 10);
  } else {
    audio.playMeow(1.15);
    befriend(2, 12);
  }
  showSheet(
    "康復了！🎉",
    ill.cure === "shot" ? "💉 嗚…好痛，但是身體舒服多了！（好感度 -2）" : `${cure.icon} 乖乖吃藥，馬上就有精神了！`,
    "太好了",
    showPetHome,
  );
}

// ---------- 客廳裡的自主行為 ----------
const BEHAVIORS = [
  { id: "walk", weight: 5 },
  { id: "zoomies", weight: 1 },
  { id: "jump", weight: 2 },
  { id: "lick", weight: 3, text: "舔舔腳掌～", fx: "👅" },
  { id: "wash", weight: 2, text: "洗洗臉，變帥了喵", fx: "✨" },
  { id: "stretch", weight: 2, text: "伸～懶～腰～", fx: "💫" },
  { id: "spin", weight: 1, text: "尾巴！別跑！", fx: "🌀" },
  { id: "yawn", weight: 2, text: "哈～啊～🥱", fx: "💤" },
  { id: "nap", weight: 1 },
  { id: "poop", weight: 1 },
];
const ANIM_CLASSES = ["cat-walk", "cat-jump", "cat-lick", "cat-stretch", "cat-spin", "cat-scratch"];

function catEl() {
  return document.querySelector(".pet-room-cat-wrap");
}
function catXPercent() {
  const stage = $("petRoomStage"),
    x = parseFloat(catEl()?.style.getPropertyValue("--cat-x")) || 0;
  return stage ? 50 + (x / stage.clientWidth) * 100 : 50;
}
function animate(cls, ms = 900) {
  const el = catEl();
  if (!el) return;
  el.classList.remove(...ANIM_CLASSES);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}
function walkTo(px, speed = 1) {
  const el = catEl();
  if (!el) return;
  const from = parseFloat(el.style.getPropertyValue("--cat-x")) || 0;
  el.style.setProperty("--cat-flip", px < from ? "-1" : "1");
  el.style.setProperty("--cat-walk-ms", `${Math.round((Math.abs(px - from) * 14) / speed) + 300}ms`);
  el.style.setProperty("--cat-x", `${px}px`);
  animate("cat-walk", (Math.abs(px - from) * 14) / speed + 300);
}
function randomSpot() {
  const w = $("petRoomStage")?.clientWidth || 320,
    range = Math.max(0, w / 2 - 95);
  return Math.round((Math.random() * 2 - 1) * range);
}
function say(text) {
  const speech = $("petSpeech");
  if (!speech) return;
  speech.textContent = text;
  speech.classList.remove("show");
  void speech.offsetWidth;
  speech.classList.add("show");
}

function doBehavior() {
  const s = petStatus(activePetKey());
  if (s.sick) {
    // 生病時大多趴著，偶爾打噴嚏
    const ill = sickInfo();
    setRoomCatPose("sleep", null, "pet-sleep");
    if (Math.random() < 0.5) {
      spawnRoomHeart(catXPercent(), 55, ill.icon);
      say(ill.id === "cold" || ill.id === "fever" ? "哈啾！" : "嗚…不舒服…");
    }
    return;
  }
  const tired = s.energy < 25 || s.fatigue > 80;
  const pool = BEHAVIORS.map((b) => ({ ...b, weight: b.id === "nap" && tired ? 8 : b.weight }));
  let r = Math.random() * pool.reduce((t, b) => t + b.weight, 0),
    b = pool[0];
  for (b of pool) if ((r -= b.weight) < 0) break;
  if (b.id !== "nap") setRoomCatPose("idle", null, "");
  switch (b.id) {
    case "walk":
      walkTo(randomSpot());
      break;
    case "zoomies":
      say("暴衝時間！💨");
      walkTo(randomSpot(), 3);
      setTimeout(() => walkTo(randomSpot(), 3), 700);
      break;
    case "jump":
      animate("cat-jump", 800);
      if (petData.roomFurniture?.cattree) {
        say("跳上貓跳台！");
        walkTo(-Math.round(($("petRoomStage")?.clientWidth || 320) / 2 - 95));
      }
      break;
    case "nap":
      setRoomCatPose("sleep", "呼嚕…呼嚕…", "pet-sleep");
      spawnRoomHeart(catXPercent(), 60, "💤");
      break;
    case "poop":
      say("去一下廁所…");
      walkTo(Math.round(($("petRoomStage")?.clientWidth || 320) / 2 - 95));
      setTimeout(addLitterClump, 2200);
      break;
    default:
      animate(`cat-${b.id === "wash" ? "lick" : b.id === "yawn" ? "stretch" : b.id}`, 1100);
      say(b.text);
      spawnRoomHeart(catXPercent(), 55, b.fx);
  }
}

// ---------- 需要玩家回應的隨機事件 ----------
// 每個事件：出現在客廳的按鈕（emoji、提示文字、位置），點了做什麼，沒點會怎樣
const EVENTS = {
  gift: {
    icon: "🐭",
    label: "叼來禮物",
    weight: 2,
    pos: () => [catXPercent() + 12, 18],
    start: () => say("送你的禮物喵！"),
    tap: () => {
      const coins = 10 + Math.floor(Math.random() * 21);
      addCoins(coins);
      audio.playCoin();
      befriend(2, 4);
      say(`收到禮物！🪙 +${coins}`);
    },
  },
  cuddle: {
    icon: "🥺",
    label: "討摸摸",
    weight: 3,
    pos: () => [catXPercent(), 72],
    start: () => say("摸摸我嘛～"),
    tap: () => {
      audio.startPurr();
      setTimeout(() => audio.stopPurr(), 1600);
      setRoomCatPose("pet", "呼嚕呼嚕～最喜歡你了", "pet-bounce");
      befriend(4, 6);
      spawnRoomHeart(catXPercent(), 60, "💕");
    },
    miss: () => say("哼，不理你了…"),
  },
  scratch: {
    icon: "🙅",
    label: "在抓地毯！制止",
    weight: 2,
    pos: () => [catXPercent(), 72],
    start: () => {
      animate("cat-scratch", 6000);
      say("磨爪爪～嘿嘿");
    },
    tap: () => {
      catEl()?.classList.remove("cat-scratch");
      say("好啦不抓了…😿");
      befriend(1, -1);
    },
    miss: () => {
      petStatus(activePetKey()).cleanliness = clamp(petStatus(activePetKey()).cleanliness - 5);
      savePetData();
      say("地毯抓花了，好舒服～（清潔 -5）");
    },
  },
  hairball: {
    icon: "🟤",
    label: "吐毛球了，清掉",
    weight: 2,
    pos: () => [catXPercent() + 14, 12],
    start: () => {
      setRoomCatPose("play", "嘔…嘔…噗！", "pet-wiggle");
      const s = petStatus(activePetKey());
      s.hairballs = (s.hairballs || 0) + 1;
      savePetData();
    },
    tap: () => {
      audio.playSand();
      const s = petStatus(activePetKey());
      s.cleanliness = clamp(s.cleanliness + 5);
      savePetData();
      befriend(1, 2);
      say("謝謝鏟屎官～（毛球太多會生病喔）");
    },
    miss: () => say("毛球還在地上…"),
  },
  hungry: {
    icon: "🍽️",
    label: "肚子餓，餵飯",
    weight: 0, // 只在飽食度低時出現
    pos: () => [catXPercent() - 14, 30],
    start: () => {
      audio.playMeow(1.3);
      say("飯飯！飯飯！喵～");
    },
    tap: () => handleDailyCare("feed"),
  },
  butterfly: {
    icon: "🦋",
    label: "窗外有蝴蝶",
    weight: 2,
    pos: () => [20 + Math.random() * 60, 82],
    start: () => say("咔咔咔咔…（盯）"),
    tap: () => {
      walkTo(randomSpot(), 2);
      animate("cat-jump", 800);
      say("飛撲！差一點就抓到了！");
      befriend(1, 5);
    },
  },
};
const EVENT_MS = 8000;
let activeEvent = null;

function startEvent() {
  const s = petStatus(activePetKey());
  const ids = Object.keys(EVENTS).filter((id) => EVENTS[id].weight > 0);
  const id =
    s.hunger < 35 && Math.random() < 0.6
      ? "hungry"
      : ids[Math.floor(Math.random() * ids.length)];
  const ev = EVENTS[id],
    [x, y] = ev.pos();
  const btn = document.createElement("button");
  btn.className = "room-event";
  btn.dataset.lifeEvent = `ev:${id}`;
  btn.style.left = `${Math.max(8, Math.min(92, x))}%`;
  btn.style.bottom = `${y}%`;
  btn.innerHTML = `<span>${ev.icon}</span><small>${ev.label}</small>`;
  $("petRoomStage").append(btn);
  ev.start();
  activeEvent = {
    id,
    btn,
    timer: setTimeout(() => {
      btn.remove();
      activeEvent = null;
      ev.miss?.();
      refreshStatusBar();
    }, EVENT_MS),
  };
}

// pet.js 的點擊委派會把 [data-life-event] 交給這裡
export function handleLifeEvent(action) {
  if (action === "clinic") return showClinic();
  if (action === "treat") return treat();
  if (!action.startsWith("ev:") || !activeEvent) return;
  clearTimeout(activeEvent.timer);
  activeEvent.btn.remove();
  const ev = EVENTS[activeEvent.id];
  activeEvent = null;
  navigator.vibrate?.(15);
  ev.tap();
  refreshStatusBar();
}

// 生病時在客廳顯示「看醫生」按鈕
function syncSickBadge() {
  const stage = $("petRoomStage");
  if (!stage) return;
  const ill = sickInfo(),
    badge = $("roomSickBadge");
  if (!ill) return badge?.remove();
  if (badge) return;
  stage.insertAdjacentHTML(
    "beforeend",
    `<button class="room-sick-badge" id="roomSickBadge" data-life-event="clinic">${ill.icon} ${escapeHtml(ill.name)}・🏥 看醫生</button>`,
  );
}

// ---------- 主迴圈 ----------
const TICK_MS = 7000;
function tick() {
  if (applyLifeTime()) refreshStatusBar();
  const stage = $("petRoomStage");
  if (!stage || document.hidden || $("homeScreen")?.hidden) return;
  syncSickBadge();
  if (activeEvent && !stage.contains(activeEvent.btn)) {
    clearTimeout(activeEvent.timer); // 小屋重繪過，事件按鈕已不在畫面上
    activeEvent = null;
  }
  if (!activeEvent && !petStatus(activePetKey()).sick && Math.random() < 0.2) startEvent();
  else doBehavior();
}
export function startLife() {
  applyLifeTime();
  setInterval(tick, TICK_MS);
}
