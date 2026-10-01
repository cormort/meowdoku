// main.js — 進入點：貓咪小屋是首頁，小遊戲是小屋裡的房間（以網址 hash 切換，手機返回鍵可用）
//   #/            貓咪小屋
//   #/meowdoku    貓咪邏輯謎題
//   #/quiz/<id>   問答題庫（quizzes/<檔名>.json）
import { audio } from "../audio.js";
import { $, LS, hideSheet, escapeHtml } from "./ui.js";
import { petData, showPetHome, leavePetHome, showStarterSetup, syncGrowthStages } from "./pet.js";
import { initPuzzle, enterPuzzle, leavePuzzle, renderBoard } from "./meowdoku.js";
import { loadPacks, startQuiz } from "./quiz.js";

const packsReady = loadPacks().catch((err) => {
  console.error("讀取題庫失敗", err);
  return [];
});

const GAMES = [{ href: "#/meowdoku", icon: "🧩", title: "貓咪邏輯謎題", desc: "每列每行每色塊各一隻貓" }];

async function renderGameList() {
  const packs = await packsReady;
  $("gameList").innerHTML = [
    ...GAMES,
    ...packs.map((p) => ({ href: `#/quiz/${p.id}`, icon: p.icon, title: p.title, desc: p.description })),
  ]
    .map(
      (g) =>
        `<button class="game-card" data-href="${g.href}"><span class="game-icon">${g.icon}</span><b>${escapeHtml(g.title)}</b><small>${escapeHtml(g.desc)}</small></button>`,
    )
    .join("");
}

let current = null;
async function route() {
  const [, screen, id] = location.hash.split("/");
  if (current === "puzzle") leavePuzzle();
  if (current === "home") leavePetHome();
  hideSheet();
  let next = "home";
  if (screen === "meowdoku") next = "puzzle";
  else if (screen === "quiz") {
    const pack = (await packsReady).find((p) => p.id === id);
    if (pack) {
      next = "quiz";
      startQuiz(pack);
    }
  }
  current = next;
  for (const name of ["home", "puzzle", "quiz"]) $(`${name}Screen`).hidden = name !== next;
  $("homeBtn").hidden = next === "home";
  if (next === "puzzle") enterPuzzle();
  if (next === "home") showPetHome();
  scrollTo(0, 0);
}

$("gameList").addEventListener("click", (e) => {
  const card = e.target.closest("[data-href]");
  if (card) location.hash = card.dataset.href;
});
$("homeBtn").onclick = () => (location.hash = "");
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
// 觸控裝置按鈕輕震（一個委派監聽取代每局重綁）
document.addEventListener(
  "pointerup",
  (e) => {
    if (e.target.closest?.("button") && navigator.vibrate && matchMedia("(pointer:coarse)").matches)
      navigator.vibrate(4);
  },
  { passive: true },
);
window.addEventListener("hashchange", route);

(function boot() {
  const theme = localStorage.getItem(LS.theme);
  if (theme) {
    document.documentElement.dataset.theme = theme;
    $("themeBtn").textContent = theme === "dark" ? "☀️" : "🌙";
  } else if (matchMedia("(prefers-color-scheme:dark)").matches) {
    document.documentElement.dataset.theme = "dark";
    $("themeBtn").textContent = "☀️";
  }
  initPuzzle(
    petData.initialized ? localStorage.getItem(LS.skin) || petData.selected || "0" : "emoji",
  );
  if (petData.initialized) syncGrowthStages();
  else setTimeout(showStarterSetup, 180);
  renderGameList();
  route();
  if ("serviceWorker" in navigator && location.protocol !== "file:")
    navigator.serviceWorker.register("./sw.js").catch(() => {});
})();
