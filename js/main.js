// main.js — 進入點：貓咪小屋是首頁，數獨是小屋裡的小遊戲（以網址 hash 切換，手機返回鍵可用）
//   #/           貓咪小屋（小屋、學院、屬性、商店、扭蛋、稱號、紀念、活動）
//   #/meowdoku   貓咪邏輯謎題（數獨打工）
import { audio } from "../audio.js";
import { enterPuzzle, initPuzzle, leavePuzzle, renderBoard } from "./meowdoku.js";
import { startLife } from "./life.js";
import { petData, showPetHome, showStarterSetup, syncGrowthStages } from "./pet.js";
import { loadSubjects } from "./quiz.js";
import { $, LS, hideSheet } from "./ui.js";

const subjectsReady = loadSubjects().catch((err) => console.error("讀取題庫失敗", err));

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
  $("bgmBtn").textContent = audio.bgmEnabled ? "🎵 音樂：開" : "🎵 音樂：關";
  $("bgmBtn").classList.toggle("on", audio.bgmEnabled);
  $("sfxBtn").textContent = audio.sfxEnabled ? "🔊" : "🔇";
}
$("bgmBtn").onclick = () => {
  audio.toggleBgm();
  updateAudioUI();
};
$("sfxBtn").onclick = () => {
  audio.toggleSfx();
  updateAudioUI();
};
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
  document.documentElement.dataset.theme = "dark";
  const themeBtnEl = $("themeBtn");
  if (themeBtnEl) themeBtnEl.hidden = true;
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
