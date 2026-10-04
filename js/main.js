// main.js — 進入點：貓咪小屋是首頁，數獨是小屋裡的小遊戲（以網址 hash 切換，手機返回鍵可用）
//   #/           貓咪小屋（小屋、學院、屬性、商店、扭蛋、稱號、紀念、活動）
//   #/meowdoku   貓咪邏輯謎題（數獨打工）
import { audio } from "../audio.js";
import { enterPuzzle, initPuzzle, leavePuzzle, renderBoard } from "./meowdoku.js";
import { startLife } from "./life.js";
import { petData, showPetHome, showStarterSetup, syncGrowthStages } from "./pet.js?v=20261004";
import { loadSubjects, loadUnits } from "./quiz.js";
import { $, LS, hideSheet } from "./ui.js";

const subjectsReady = Promise.all([loadSubjects(), loadUnits()]).catch((err) =>
  console.error("讀取題庫失敗", err),
);

let currentScreen = null;
function route() {
  const next = location.hash === "#/meowdoku" ? "puzzle" : "home";
  if (currentScreen === "puzzle" && next !== "puzzle") leavePuzzle();
  hideSheet();
  currentScreen = next;
  $("homeScreen").hidden = next !== "home";
  $("puzzleScreen").hidden = next !== "puzzle";
  $("homeBtn").hidden = next === "home";
  $("puzzleBtn").hidden = next === "puzzle";
  if (next === "puzzle") enterPuzzle();
  else showPetHome();
  // 各場景配樂：數獨打工有專屬曲，其餘分頁（小屋／出門／商店…）用小屋的主題曲
  audio.setScene(next === "puzzle" ? "puzzle" : "room");
  scrollTo(0, 0);
}

$("homeBtn").onclick = () => (location.hash = "");
$("puzzleBtn").onclick = () => (location.hash = "#/meowdoku");
$("themeBtn").onclick = () => {
  const dark = document.documentElement.dataset.theme !== "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  localStorage.setItem(LS.theme, dark ? "dark" : "light");
  $("themeBtn").textContent = dark ? "☀️" : "🌙";
  renderBoard();
};
$("overlay").addEventListener("click", (e) => {
  if (e.target === $("overlay")) hideSheet();
});
function updateAudioUI() {
  const audioBtn = $("audioBtn");
  const bgmToggle = $("bgmToggle");
  const sfxToggle = $("sfxToggle");
  if (bgmToggle) bgmToggle.checked = !!audio.bgmEnabled;
  if (sfxToggle) sfxToggle.checked = !!audio.sfxEnabled;

  if (audioBtn) {
    let icon = "🔇";
    let title = "聲音：已全部靜音（點擊開啟／長按展開細調）";
    let isOn = false;
    if (audio.bgmEnabled && audio.sfxEnabled) {
      icon = "🔊";
      title = "聲音：音樂與音效皆開啟（點擊全部靜音／長按展開細調）";
      isOn = true;
    } else if (audio.bgmEnabled) {
      icon = "🎵";
      title = "聲音：僅音樂開啟（點擊全部靜音／長按展開細調）";
      isOn = true;
    } else if (audio.sfxEnabled) {
      icon = "🔈";
      title = "聲音：僅音效開啟（點擊全部靜音／長按展開細調）";
      isOn = true;
    }
    audioBtn.textContent = icon;
    audioBtn.title = title;
    audioBtn.classList.toggle("on", isOn);
  }
}

const audioBtn = $("audioBtn");
const audioPopup = $("audioPopup");
let lastAudioState = { bgm: true, sfx: true };

if (audioBtn && audioPopup) {
  let pressTimer = null;
  let isLongPress = false;

  const togglePopup = (show) => {
    const shouldShow = show ?? audioPopup.classList.contains("hidden");
    audioPopup.classList.toggle("hidden", !shouldShow);
  };

  audioBtn.addEventListener("pointerdown", () => {
    isLongPress = false;
    pressTimer = setTimeout(() => {
      isLongPress = true;
      togglePopup(true);
      navigator.vibrate?.(20);
    }, 450);
  });

  const clearTimer = () => clearTimeout(pressTimer);
  audioBtn.addEventListener("pointerup", clearTimer);
  audioBtn.addEventListener("pointercancel", clearTimer);
  audioBtn.addEventListener("mouseup", clearTimer);
  audioBtn.addEventListener("mouseleave", clearTimer);

  audioBtn.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    togglePopup(true);
  });

  const setBgm = (enable) => {
    if (audio.bgmEnabled !== !!enable) {
      if (typeof audio.setBgm === "function") audio.setBgm(enable);
      else audio.toggleBgm();
    }
  };
  const setSfx = (enable) => {
    if (audio.sfxEnabled !== !!enable) {
      if (typeof audio.setSfx === "function") audio.setSfx(enable);
      else audio.toggleSfx();
    }
  };

  audioBtn.addEventListener("click", () => {
    if (isLongPress) {
      isLongPress = false;
      return;
    }
    if (!audioPopup.classList.contains("hidden")) {
      togglePopup(false);
      return;
    }
    if (audio.bgmEnabled || audio.sfxEnabled) {
      lastAudioState = { bgm: audio.bgmEnabled, sfx: audio.sfxEnabled };
      setBgm(false);
      setSfx(false);
    } else {
      setBgm(lastAudioState.bgm ?? true);
      setSfx(lastAudioState.sfx ?? true);
    }
    updateAudioUI();
  });

  $("bgmToggle")?.addEventListener("change", (e) => {
    setBgm(e.target.checked);
    updateAudioUI();
  });

  $("sfxToggle")?.addEventListener("change", (e) => {
    setSfx(e.target.checked);
    updateAudioUI();
  });

  document.addEventListener("click", (e) => {
    if (!audioPopup.classList.contains("hidden") && !e.target.closest(".audio-ctrl-wrap")) {
      togglePopup(false);
    }
  });
}

updateAudioUI();
// 瀏覽器要求先有使用者操作才能出聲：第一次互動時解鎖並補播背景音樂
window.addEventListener(
  "pointerdown",
  () => {
    audio.init();
    if (audio.bgmEnabled) audio.startBgm();
  },
  { once: true },
);
// 觸控裝置按鈕輕震（一個委派監聽取代每局重綁到所有按鈕）
document.addEventListener(
  "pointerup",
  (e) => {
    if (e.target.closest?.("button") && navigator.vibrate && matchMedia("(pointer:coarse)").matches)
      navigator.vibrate(4);
  },
  { passive: true },
);
window.addEventListener("hashchange", route);

(async function boot() {
  // 介面採美少女夢工廠風格：整體是暗色的和室／木框，固定使用 dark 主題
  // （dark 主題同時決定數獨色塊的暗色盤，淺色盤在這個介面上會太亮）
  // 預設亮色（可自行切換夜間模式）；不再強制深色
  const savedTheme = localStorage.getItem(LS.theme);
  document.documentElement.dataset.theme = savedTheme === "dark" ? "dark" : "light";
  const themeBtnEl = $("themeBtn");
  if (themeBtnEl) {
    themeBtnEl.hidden = false;
    themeBtnEl.textContent = savedTheme === "dark" ? "☀️" : "🌙";
  }
  initPuzzle(
    petData.initialized ? localStorage.getItem(LS.skin) || petData.selected || "0" : "emoji",
  );
  startLife();
  if (petData.initialized) syncGrowthStages();
  else setTimeout(showStarterSetup, 180);
  await subjectsReady; // 學院頁需要學科表
  route();
  if ("serviceWorker" in navigator && location.protocol !== "file:")
    navigator.serviceWorker.register("./sw.js").catch(() => {});
})();
