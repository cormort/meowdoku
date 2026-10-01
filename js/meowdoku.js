// meowdoku.js — 貓咪邏輯謎題（數獨打工）：盤面、生成、操作、換貓動畫
import {
  makeRng,
  hashSeed,
  generatePuzzle,
  logicSolve,
  findConflicts,
  isSolved,
  aroundNeighbors,
  rowColOf,
  indexOf,
} from "../engine.js?v=3";
import { audio } from "../audio.js";
import { activePetKey, addCoins, addEventProgress, addPetStat, awardFood, petData, rewardHtml, setPetView } from "./pet.js";
import { $, LS, getSkinAudioContext, hideSheet, playSkinArrivalSound, playSkinLaunchSound, playSkinTrailSound, showSheet } from "./ui.js";
const MARK = "✕",
  CAT = "🐱";
const REGION_COLORS = [
  "#f8c4c0",
  "#fbd5a5",
  "#f5e98f",
  "#c3e6aa",
  "#a6ded3",
  "#b7d2f5",
  "#d0c5f4",
  "#f4c0df",
  "#dcc8ae",
];
const REGION_COLORS_DARK = [
  "#6a2a2a",
  "#6b3f14",
  "#5e5414",
  "#2f5a1c",
  "#145a4e",
  "#1e3f73",
  "#432f7a",
  "#652050",
  "#4e3d2a",
];
const state = {
  n: 5,
  owner: [],
  solution: [],
  cells: [],
  lives: 3,
  mode: "mark",
  autoX: true,
  skin: "emoji",
  startedAt: 0,
  elapsed: 0,
  timer: null,
  done: false,
  daily: false,
  dailyKey: null,
  history: [],
  cursor: 0,
  hints: 0,
  autoMarked: new Set(),
};
function regionColor(r) {
  return (
    document.documentElement.dataset.theme === "dark" ? REGION_COLORS_DARK : REGION_COLORS
  )[r % 9];
}
function renderRegionLines() {
  const wrap = document.querySelector(".boardWrap");
  wrap.querySelector(".region-lines")?.remove();
  const n = state.n,
    ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.classList.add("region-lines");
  svg.setAttribute("viewBox", `0 0 ${n} ${n}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");

  // 以每個色塊的封閉輪廓繪製，而非逐格拼接線段。
  // 封閉路徑搭配 round join，可讓凸角與凹角都真正呈現圓角。
  const regions = [...new Set(state.owner)];
  const key = (x1, y1, x2, y2) => `${x1},${y1},${x2},${y2}`;
  const pointKey = (p) => `${p[0]},${p[1]}`;
  for (const reg of regions) {
    const edges = new Map();
    const add = (a, b) => edges.set(key(a[0], a[1], b[0], b[1]), { a, b });
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        const i = indexOf(n, r, c);
        if (state.owner[i] !== reg) continue;
        // 順時針加入色塊外緣，確保相鄰格子的內邊不會被畫出。
        if (r === 0 || state.owner[i - n] !== reg) add([c, r], [c + 1, r]);
        if (c === n - 1 || state.owner[i + 1] !== reg) add([c + 1, r], [c + 1, r + 1]);
        if (r === n - 1 || state.owner[i + n] !== reg) add([c + 1, r + 1], [c, r + 1]);
        if (c === 0 || state.owner[i - 1] !== reg) add([c, r + 1], [c, r]);
      }
    const starts = new Map();
    for (const e of edges.values()) {
      const k = pointKey(e.a);
      if (!starts.has(k)) starts.set(k, []);
      starts.get(k).push(e);
    }
    const used = new Set(),
      commands = [];
    for (const first of edges.values()) {
      const fk = key(...first.a, ...first.b);
      if (used.has(fk)) continue;
      let cur = first,
        guard = edges.size + 2;
      commands.push(`M ${cur.a[0]} ${cur.a[1]}`);
      while (cur && guard-- > 0) {
        const ck = key(...cur.a, ...cur.b);
        if (used.has(ck)) break;
        used.add(ck);
        commands.push(`L ${cur.b[0]} ${cur.b[1]}`);
        const choices = (starts.get(pointKey(cur.b)) || []).filter(
          (e) => !used.has(key(...e.a, ...e.b)),
        );
        cur = choices[0] || null;
      }
      commands.push("Z");
    }
    if (commands.length) {
      const path = document.createElementNS(ns, "path");
      path.classList.add("region-boundary");
      path.setAttribute("d", commands.join(" "));
      svg.append(path);
    }
  }

  wrap.append(svg);
}

export function renderBoard() {
  if (!state.owner.length) return;
  const board = $("board"),
    n = state.n;
  board.style.setProperty("--n", n);
  board.style.gridTemplateColumns = `repeat(${n},minmax(0,1fr))`;
  board.style.gridTemplateRows = `repeat(${n},minmax(0,1fr))`;
  board.replaceChildren();
  for (let i = 0; i < n * n; i++) {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.dataset.i = i;
    cell.type = "button";
    cell.setAttribute("role", "gridcell");
    const [r, c] = rowColOf(n, i);
    cell.style.background = regionColor(state.owner[i]);
    cell.innerHTML = "<i></i>";
    board.append(cell);
  }
  paintCells();
  renderRegionLines();
}
function paintCells() {
  const board = $("board"),
    bad = findConflicts(state.n, state.owner, catsOnBoard());
  [...board.children].forEach((cell, i) => {
    const kind = state.cells[i],
      icon = cell.firstElementChild,
      face = kind === 2 ? faceOf(i) : -1;
    icon.classList.toggle("face", face >= 0);
    if (face >= 0) icon.style.backgroundPosition = facePos(face);
    else icon.style.backgroundPosition = "";
    icon.textContent = face >= 0 ? "" : kind === 2 ? CAT : kind === 1 ? MARK : "";
    cell.classList.toggle("cat", kind === 2);
    cell.classList.toggle("mark", kind === 1);
    cell.classList.toggle("autox", kind === 1 && state.autoMarked?.has(i));
    cell.classList.toggle("bad", bad.has(i));
    cell.classList.toggle("cursor", i === state.cursor);
    cell.setAttribute(
      "aria-label",
      `第 ${Math.floor(i / state.n) + 1} 列第 ${(i % state.n) + 1} 行`,
    );
  });
  $("progress").textContent = `${catsOnBoard().length}/${state.n}`;
  $("hearts").textContent =
    "🐟".repeat(state.lives) + "·".repeat(Math.max(0, 3 - state.lives));
}
function faceOf(i) {
  if (state.skin === "emoji") return -1;
  if (state.skin === "mix") return (state.owner[i] * 29 + state.n * 7) % 81;
  return Number(state.skin);
}
export function facePos(k) {
  return `${(k % 9) * 12.5}% ${Math.floor(k / 9) * 12.5}%`;
}
function showSkinPicker() {
  const on = (v) => (state.skin === v ? " on" : "");
  let html = `<div class="skins"><button class="wide${on("emoji")}" data-skin="emoji">🐱 原本表情符號</button><button class="wide${on("mix")}" data-skin="mix">🎲 每隻都不同</button>`;
  for (let k = 0; k < 81; k++)
    html += `<button class="${on(String(k))}" data-skin="${k}" aria-label="貓臉 ${k + 1}"><i class="face" style="background-position:${facePos(k)}"></i></button>`;
  showSheet("更換貓咪圖示", html + "</div>", "關閉");
}
function catsOnBoard() {
  const out = [];
  state.cells.forEach((v, i) => {
    if (v === 2) out.push(i);
  });
  return out;
}

function setLoading(show, text = "生成題目中…") {
  $("loadingText").textContent = text;
  $("loading").classList.toggle("hidden", !show);
}
function startTimer() {
  clearInterval(state.timer);
  state.startedAt = Date.now() - state.elapsed * 1000;
  state.timer = setInterval(() => {
    state.elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
    $("timer").textContent = fmtTime(state.elapsed);
  }, 250);
}
function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
const chunkinessOf = (n) => (n <= 5 ? 0.75 : n <= 7 ? 0.5 : 0.35),
  randomSeed = () => (Date.now() ^ (Math.random() * 4294967295)) >>> 0;
function makeGenerator() {
  let worker = null;
  try {
    worker = new Worker("./gen-worker.js", { type: "module" });
  } catch {
    worker = null;
  }
  let seq = 0;
  const pending = new Map();
  if (worker) {
    worker.onmessage = (event) => {
      const job = pending.get(event.data.id);
      if (job) {
        job.resolve(event.data.puzzle);
        pending.delete(event.data.id);
      }
    };
    worker.onerror = () => {
      worker?.terminate();
      worker = null;
      for (const job of pending.values()) job.resolve(undefined);
      pending.clear();
    };
  }
  return (n, seed) => {
    const fallback = () =>
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve(
              generatePuzzle(n, {
                rng: makeRng(seed),
                chunkiness: chunkinessOf(n),
                maxTries: 60,
              }),
            ),
          20,
        ),
      );
    if (!worker) return fallback();
    const id = ++seq;
    return new Promise((resolve) => {
      pending.set(id, { resolve });
      worker.postMessage({ id, n, seed, chunkiness: chunkinessOf(n) });
    }).then((puzzle) => (puzzle === undefined ? fallback() : puzzle));
  };
}
const requestPuzzle = makeGenerator(),
  requestPrefetch = makeGenerator(),
  prefetched = new Map();
function prefetch(n) {
  if (!prefetched.has(n)) prefetched.set(n, requestPrefetch(n, randomSeed()));
}
let gameSeq = 0;
async function newGame({ n = state.n, daily = false, seed = null } = {}) {
  const my = ++gameSeq;
  let job;
  if (seed === null && prefetched.has(n)) {
    job = prefetched.get(n);
    prefetched.delete(n);
  } else job = requestPuzzle(n, seed === null ? randomSeed() : seed);
  const spinner = setTimeout(
      () => setLoading(true, daily ? "生成今日題目…" : "生成題目中…"),
      120,
    ),
    puzzle = await job;
  clearTimeout(spinner);
  if (my !== gameSeq) return;
  setLoading(false);
  if (!puzzle) {
    showSheet("生成失敗", "請再試一次。", "再試一次", () => newGame({ n, daily, seed }));
    return;
  }
  lastPlacedCatIndex = -1;
  Object.assign(state, {
    n: puzzle.n,
    owner: puzzle.owner,
    solution: puzzle.solution,
    cells: new Array(puzzle.n * puzzle.n).fill(0),
    lives: 3,
    done: false,
    elapsed: 0,
    history: [],
    cursor: 0,
    hints: 0,
    daily,
    dailyKey: daily ? todayKey() : null,
    autoMarked: new Set(),
    genMs: puzzle.stats.ms,
  });
  $("timer").textContent = "00:00";
  renderBoard();
  startTimer();
  updateBestLabel();
  saveResume();
  document
    .querySelectorAll(".levels [data-n]")
    .forEach((b) => b.classList.toggle("on", Number(b.dataset.n) === state.n));
  prefetch(n);
}
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function saveResume() {
  try {
    localStorage.setItem(
      LS.resume,
      JSON.stringify({
        n: state.n,
        owner: state.owner,
        solution: state.solution,
        cells: state.cells,
        lives: state.lives,
        elapsed: state.elapsed,
        daily: state.daily,
        dailyKey: state.dailyKey,
        autoMarked: [...state.autoMarked],
        done: state.done,
      }),
    );
  } catch {}
}
function loadResume() {
  try {
    const s = JSON.parse(localStorage.getItem(LS.resume));
    if (!s?.owner?.length || !s?.cells?.length) return false;
    Object.assign(state, {
      n: s.n,
      owner: s.owner,
      solution: s.solution,
      cells: s.cells,
      lives: s.lives ?? 3,
      elapsed: s.elapsed || 0,
      daily: !!s.daily,
      dailyKey: s.dailyKey || null,
      done: !!s.done,
      history: [],
      cursor: 0,
      hints: 0,
      autoMarked: new Set(s.autoMarked || []),
    });
    lastPlacedCatIndex = -1;
    refreshLastPlacedCatIndex();
    renderBoard();
    $("timer").textContent = fmtTime(state.elapsed);
    if (!state.done) startTimer();
    updateBestLabel();
    document
      .querySelectorAll(".levels [data-n]")
      .forEach((b) => b.classList.toggle("on", Number(b.dataset.n) === state.n));
    return true;
  } catch {
    return false;
  }
}
function updateBestLabel() {
  const best = Number(localStorage.getItem(LS.best(state.n)) || 0);
  $("bestLabel").textContent = best ? `🏆 ${fmtTime(best)}` : "🏆 --:--";
}
function pushHistory() {
  state.history.push({
    cells: state.cells.slice(),
    lives: state.lives,
    autoMarked: [...state.autoMarked],
  });
  if (state.history.length > 200) state.history.shift();
}
function applyAutoMarks(cell) {
  if (!state.autoX) return;
  const n = state.n,
    mark = (i) => {
      if (state.cells[i] === 0) {
        state.cells[i] = 1;
        state.autoMarked.add(i);
      }
    };
  const [r, c] = rowColOf(n, cell);
  for (let k = 0; k < n; k++) {
    mark(indexOf(n, r, k));
    mark(indexOf(n, k, c));
  }
  for (let i = 0; i < n * n; i++) if (state.owner[i] === state.owner[cell]) mark(i);
  for (const nb of aroundNeighbors(n, cell)) mark(nb);
}
function clearAutoMarks() {
  for (const i of state.autoMarked) if (state.cells[i] === 1) state.cells[i] = 0;
  state.autoMarked = new Set();
}
function tapCell(i) {
  if (state.done) return;
  state.cursor = i;
  if (state.mode === "mark") {
    pushHistory();
    state.cells[i] = state.cells[i] === 1 ? 0 : 1;
    state.autoMarked.delete(i);
    state.cells[i] ? audio.playMark() : audio.playClear();
    paintCells();
    saveResume();
    return;
  }
  if (state.cells[i] === 2) {
    pushHistory();
    state.cells[i] = 0;
    audio.playClear();
    if (lastPlacedCatIndex === i) {
      lastPlacedCatIndex = -1;
      refreshLastPlacedCatIndex();
    }
    paintCells();
    saveResume();
    return;
  }
  const trial = catsOnBoard();
  trial.push(i);
  if (findConflicts(state.n, state.owner, trial).size) {
    state.lives--;
    audio.playError();
    paintCells();
    const el = $("board").children[i];
    el.classList.add("bad");
    setTimeout(() => el.classList.remove("bad"), 320);
    if (state.lives <= 0) {
      clearInterval(state.timer);
      showSheet("沒有小魚乾了 🐟", `這一局用了 ${fmtTime(state.elapsed)}。`, "再試一次", () =>
        newGame({
          n: state.n,
          daily: state.daily,
          seed: state.daily ? hashSeed(state.dailyKey) : null,
        }),
      );
    }
    saveResume();
    return;
  }
  pushHistory();
  state.cells[i] = 2;
  lastPlacedCatIndex = i;
  audio.playCatPlace();
  state.autoMarked.delete(i);
  applyAutoMarks(i);
  setMode("mark");
  paintCells();
  saveResume();
  checkWin();
}
function clearCell(i) {
  if (state.done) return;
  pushHistory();
  state.cells[i] = 0;
  state.autoMarked.delete(i);
  if (lastPlacedCatIndex === i) {
    lastPlacedCatIndex = -1;
    refreshLastPlacedCatIndex();
  }
  paintCells();
  saveResume();
}
function setMode(mode) {
  state.mode = mode;
  $("modeMarkBtn").classList.toggle("on", mode === "mark");
  $("modeCatBtn").classList.toggle("on", mode === "cat");
  localStorage.setItem("meowdoku.mode", mode);
}
function checkWin() {
  const cats = catsOnBoard();
  if (!isSolved(state.n, state.owner, cats)) return;
  state.done = true;
  clearInterval(state.timer);
  state.elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
  const key = LS.best(state.n),
    prev = Number(localStorage.getItem(key) || 0),
    isBest = !prev || state.elapsed < prev;
  if (isBest) localStorage.setItem(key, String(state.elapsed));
  updateBestLabel();
  const activeKey = activePetKey();
  petData.affection[activeKey] = (petData.affection[activeKey] || 0) + 8;
  const wonCoins = state.n === 5 ? 60 : state.n === 7 ? 120 : 200;
  addCoins(wonCoins);
  addPetStat(activeKey, "math", 4);
  const reward = awardFood({ n: state.n, daily: state.daily });
  addEventProgress("wins", 1);
  if (state.n >= 7) addEventProgress("hard", 1);
  saveResume();
  showSheet(
    isBest ? "新紀錄！🏆" : "完成！🎉",
    `${state.n}×${state.n} 用了 <b>${fmtTime(state.elapsed)}</b>${rewardHtml(reward)}<div class="win-coins-notice">🪙 +${wonCoins} 金幣 · 📐 算術邏輯 +4</div>`,
    "下一題",
    () => newGame({ n: state.n }),
    "前往貓屋",
    () => {
      setPetView("home");
      location.hash = "";
    },
  );
}
function giveHint() {
  if (state.done) return;
  audio.playHint();
  const result = logicSolve(state.n, state.owner, { collect: true }),
    placed = new Set(catsOnBoard()),
    technique = result.techniques?.find((t) => !placed.has(t.cell));
  let target = technique?.cell;
  if (target === undefined) {
    for (let r = 0; r < state.n; r++) {
      const wanted = r * state.n + state.solution[r];
      if (state.cells[wanted] !== 2) {
        target = wanted;
        break;
      }
    }
  }
  if (target === undefined) return;
  state.cursor = target;
  paintCells();
  const el = $("board").children[target];
  el.classList.add("hint");
  setTimeout(() => el.classList.remove("hint"), 2100);
  showSheet(
    "提示",
    technique
      ? technique.why === "region"
        ? "這個色塊只剩一個位置能放貓"
        : technique.why === "row"
          ? "這一列只剩一個位置能放貓"
          : "這一行只剩一個位置能放貓"
      : "已標出這一列還缺的貓位。",
    "知道了",
  );
}
/* 換貓動畫 */
const SKIN_COOLDOWN_MS = 2500;
let skinSelecting = false,
  skinCooldownUntil = 0,
  skinCooldownFrame = 0,
  lastPlacedCatIndex = -1,
  skinEffectsLayer = null,
  puzzleActive = false;
const PERF = {
  mobile: matchMedia("(hover:none),(pointer:coarse),(max-width:600px)").matches,
  low:
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4),
  hidden: false,
  activeFx: 0,
  maxFx: 40,
};
if (PERF.low) document.documentElement.classList.add("low-fx");
document.addEventListener("visibilitychange", () => {
  PERF.hidden = document.hidden;
  if (document.hidden) {
    clearSkinEffects();
    unlockView();
  }
});

function getSkinEffectsLayer() {
  if (skinEffectsLayer && document.body.contains(skinEffectsLayer)) return skinEffectsLayer;
  skinEffectsLayer = document.createElement("div");
  skinEffectsLayer.className = "skin-effects-layer";
  skinEffectsLayer.ariaHidden = "true";
  document.body.append(skinEffectsLayer);
  return skinEffectsLayer;
}
function getSkinCooldownRemaining() {
  return Math.max(0, skinCooldownUntil - performance.now());
}
function updateSkinCooldownButton() {
  const b = $("skinBtn"),
    l = $("skinBtnLabel"),
    r = getSkinCooldownRemaining();
  cancelAnimationFrame(skinCooldownFrame);
  if (r <= 0) {
    b.disabled = false;
    b.classList.remove("skin-cooldown");
    b.style.removeProperty("--cooldown-progress");
    b.title = "更換貓咪圖示";
    l.textContent = "🐱 換貓";
    return;
  }
  b.disabled = true;
  b.classList.add("skin-cooldown");
  b.style.setProperty("--cooldown-progress", String(r / SKIN_COOLDOWN_MS));
  const s = Math.ceil(r / 1000);
  b.title = `換貓冷卻中，剩餘 ${s} 秒`;
  l.textContent = `⏳ ${s} 秒`;
  skinCooldownFrame = requestAnimationFrame(updateSkinCooldownButton);
}
function startSkinCooldown() {
  skinCooldownUntil = performance.now() + SKIN_COOLDOWN_MS;
  updateSkinCooldownButton();
}
function clearSkinEffects() {
  skinEffectsLayer?.replaceChildren();
  PERF.activeFx = 0;
}
function visualOffset() {
  const v = window.visualViewport;
  return { x: v?.offsetLeft || 0, y: v?.offsetTop || 0 };
}
function rectCenter(rect) {
  const o = visualOffset();
  return { x: rect.left + rect.width / 2 - o.x, y: rect.top + rect.height / 2 - o.y };
}
function rectOrigin(rect) {
  const o = visualOffset();
  return { x: rect.left - o.x, y: rect.top - o.y };
}
function refreshLastPlacedCatIndex() {
  if (lastPlacedCatIndex >= 0 && state.cells[lastPlacedCatIndex] === 2)
    return lastPlacedCatIndex;
  lastPlacedCatIndex = -1;
  for (let i = state.cells.length - 1; i >= 0; i--)
    if (state.cells[i] === 2) {
      lastPlacedCatIndex = i;
      break;
    }
  return lastPlacedCatIndex;
}
function getSkinFlightTarget() {
  const board = $("board"),
    index = refreshLastPlacedCatIndex(),
    cell = index >= 0 ? board.children[index] : null;
  if (cell) {
    const r = cell.getBoundingClientRect(),
      c = rectCenter(r);
    return {
      x: c.x,
      y: c.y,
      size: Math.max(34, Math.min(r.width, r.height) * 0.86),
      index,
      cell,
    };
  }
  const r = board.getBoundingClientRect(),
    c = rectCenter(r);
  return {
    x: c.x,
    y: c.y,
    size: Math.min(Math.max(r.width / state.n, 44), 76),
    index: -1,
    cell: null,
  };
}
function createFlyingSkin(button, skin) {
  const layer = getSkinEffectsLayer(),
    r = button.getBoundingClientRect(),
    o = rectOrigin(r),
    c = rectCenter(r),
    p = document.createElement("div");
  p.className = "skin-fly-preview";
  Object.assign(p.style, {
    left: `${o.x}px`,
    top: `${o.y}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
  });
  const source = button.querySelector(".face");
  if (source) {
    const clone = document.createElement("i"),
      s = getComputedStyle(source);
    clone.className = "face";
    Object.assign(clone.style, {
      backgroundImage: s.backgroundImage,
      backgroundSize: s.backgroundSize,
      backgroundPosition: s.backgroundPosition,
      backgroundRepeat: s.backgroundRepeat,
    });
    p.append(clone);
  } else {
    const e = document.createElement("span");
    e.className = "fly-emoji";
    e.textContent = skin === "mix" ? "🎲" : "🐱";
    p.append(e);
  }
  layer.append(p);
  return { preview: p, rect: r, startX: c.x, startY: c.y };
}
function bezier(a, c, b, t) {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}
function fx(className, x, y) {
  if (PERF.hidden || PERF.activeFx >= PERF.maxFx) return null;
  const e = document.createElement("span");
  e.className = className;
  e.style.left = `${x}px`;
  e.style.top = `${y}px`;
  PERF.activeFx++;
  getSkinEffectsLayer().append(e);
  const done = () => {
    if (e.isConnected) e.remove();
    PERF.activeFx = Math.max(0, PERF.activeFx - 1);
  };
  e.addEventListener("animationend", done, { once: true });
  setTimeout(done, 900);
  return e;
}
function trail(x, y, s = 1) {
  const e = fx("skin-trail-dot", x, y);
  if (!e) return;
  e.style.width = `${10 * s}px`;
  e.style.height = `${10 * s}px`;
}
function paw(x, y, a) {
  if (PERF.low) return;
  const e = fx("skin-paw-trail", x, y);
  if (!e) return;
  e.textContent = "🐾";
  e.style.setProperty("--paw-rotate", `${a}deg`);
}
function arrivalParticles(x, y) {
  const colors = ["var(--gold)", "var(--accent)", "#fff", "#f6c453", "#8dd8c5"];
  const n = PERF.low ? 7 : PERF.mobile ? 10 : 16;
  for (let i = 0; i < n; i++) {
    const e = fx("skin-arrival-particle", x, y);
    if (!e) break;
    const a = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.24,
      d = 24 + Math.random() * (PERF.mobile ? 32 : 48),
      size = 4 + Math.random() * 4;
    e.style.width = e.style.height = `${size}px`;
    e.style.setProperty("--particle-x", `${Math.cos(a) * d}px`);
    e.style.setProperty("--particle-y", `${Math.sin(a) * d}px`);
    e.style.setProperty("--particle-color", colors[i % colors.length]);
  }
}
function animateSkinArrival(target) {
  const board = $("board");
  board.classList.remove("skin-arrive");
  void board.offsetWidth;
  board.classList.add("skin-arrive");
  if (target.cell) {
    target.cell.classList.remove("skin-target");
    void target.cell.offsetWidth;
    target.cell.classList.add("skin-target");
  }
  if (!PERF.low) fx("skin-arrival-ring", target.x, target.y);
  arrivalParticles(target.x, target.y);
  playSkinArrivalSound();
  navigator.vibrate?.([14, 22, 24]);
  setTimeout(() => {
    board.classList.remove("skin-arrive");
    target.cell?.classList.remove("skin-target");
  }, 650);
}
function animateBoardCats(target = -1) {
  const cats = [...$("board").querySelectorAll(".cell.cat")];
  cats.forEach((cell, k) => {
    if (Number(cell.dataset.i) === target) return;
    const icon = cell.firstElementChild;
    cell.classList.remove("skin-updated");
    icon.style.animationDelay = `${Math.min(k * 36, 180)}ms`;
    void cell.offsetWidth;
    cell.classList.add("skin-updated");
  });
  setTimeout(
    () =>
      cats.forEach((c) => {
        c.classList.remove("skin-updated");
        if (c.firstElementChild) c.firstElementChild.style.animationDelay = "";
      }),
    850,
  );
}
function lockView() {
  document.documentElement.classList.add("skin-animation-lock");
  document.body.classList.add("skin-animation-lock");
}
function unlockView() {
  document.documentElement.classList.remove("skin-animation-lock");
  document.body.classList.remove("skin-animation-lock");
}
function animateSkinToLastCat(button, skin) {
  const reduced = matchMedia("(prefers-reduced-motion:reduce)").matches;
  clearSkinEffects();
  lockView();
  const target = getSkinFlightTarget();
  const { preview, rect, startX, startY } = createFlyingSkin(button, skin);
  const mobile = matchMedia("(hover:none),(pointer:coarse),(max-width:600px)").matches;
  button.classList.add("skin-choosing");
  navigator.vibrate?.(12);

  if (reduced) {
    hideSheet();
    preview.remove();
    button.classList.remove("skin-choosing");
    unlockView();
    return Promise.resolve(target);
  }

  const start = { x: startX, y: startY },
    end = { x: target.x, y: target.y };
  const dx = end.x - start.x,
    dy = end.y - start.y,
    dist = Math.hypot(dx, dy);
  const arc = mobile ? Math.min(92, 42 + dist * 0.11) : Math.min(150, 60 + dist * 0.18);
  const control = { x: start.x + dx * 0.48, y: Math.max(16, Math.min(start.y, end.y) - arc) };
  const flightDuration = Math.min(
    mobile ? 680 : 820,
    Math.max(mobile ? 500 : 580, 430 + dist * 0.28),
  );
  const popDuration = mobile ? 240 : 150;
  const popScale = mobile ? 1.72 : 1.45;
  const endScale = Math.max(0.55, target.size / Math.max(rect.width, 1));

  return new Promise((resolve) => {
    const begun = performance.now();
    let lt = 0,
      lp = 0,
      ls = 0,
      cancelled = false,
      launched = false;
    const cancel = () => (cancelled = true);
    window.addEventListener("orientationchange", cancel, { once: true });
    const finish = () => {
      window.removeEventListener("orientationchange", cancel);
      preview.remove();
      button.classList.remove("skin-choosing");
      unlockView();
      resolve(target);
    };
    function frame(now) {
      if (cancelled) {
        hideSheet();
        finish();
        return;
      }
      const elapsed = now - begun;

      // 手機先在選單原位明顯放大，再關閉選單開始飛行。
      if (elapsed < popDuration) {
        const t = Math.min(1, elapsed / popDuration);
        const ease = 1 - Math.pow(1 - t, 3);
        const scale = 1 + (popScale - 1) * Math.sin(ease * Math.PI * 0.72);
        preview.style.transform = `translate3d(0,0,0) scale(${scale}) rotate(${Math.sin(t * Math.PI) * -3}deg)`;
        preview.style.opacity = "1";
        requestAnimationFrame(frame);
        return;
      }

      if (!launched) {
        launched = true;
        hideSheet();
        playSkinLaunchSound();
        navigator.vibrate?.(18);
      }

      const raw = Math.min(1, (elapsed - popDuration) / flightDuration);
      const p = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
      const pt = bezier(start, control, end, p),
        mx = pt.x - start.x,
        my = pt.y - start.y;
      const scale =
        p < 0.25
          ? popScale + (1.2 - popScale) * (p / 0.25)
          : 1.2 + (endScale - 1.2) * ((p - 0.25) / 0.75);
      const rot = Math.sin(p * Math.PI * 2) * (mobile ? 3.5 : 5);
      preview.style.transform = `translate3d(${mx}px,${my}px,0) scale(${scale}) rotate(${rot}deg)`;
      preview.style.opacity = String(p > 0.92 ? 1 - ((p - 0.92) / 0.08) * 0.38 : 1);
      if (now - lt > (PERF.low ? 82 : mobile ? 58 : 34)) {
        lt = now;
        trail(pt.x, pt.y, 0.62 + Math.random() * 0.5);
      }
      if (!PERF.low && now - lp > (mobile ? 180 : 125) && p > 0.12 && p < 0.86) {
        lp = now;
        paw(
          pt.x + (Math.random() - 0.5) * 10,
          pt.y + (Math.random() - 0.5) * 10,
          (Math.atan2(end.y - pt.y, end.x - pt.x) * 180) / Math.PI + 90,
        );
      }
      if (!PERF.low && now - ls > 210 && p > 0.18 && p < 0.82) {
        ls = now;
        playSkinTrailSound(p);
      }
      if (raw < 1) requestAnimationFrame(frame);
      else finish();
    }
    requestAnimationFrame(frame);
  });
}

/* 事件 */
$("board").addEventListener("click", (e) => {
  const c = e.target.closest(".cell");
  if (c) tapCell(Number(c.dataset.i));
});
$("board").addEventListener("contextmenu", (e) => {
  const c = e.target.closest(".cell");
  if (c) {
    e.preventDefault();
    clearCell(Number(c.dataset.i));
  }
});
let pressTimer = 0,
  longPressed = false;
$("board").addEventListener("pointerdown", (e) => {
  const c = e.target.closest(".cell");
  if (!c || e.pointerType === "mouse") return;
  longPressed = false;
  pressTimer = setTimeout(() => {
    longPressed = true;
    clearCell(Number(c.dataset.i));
  }, 480);
});
["pointerup", "pointercancel", "pointerleave"].forEach((ev) =>
  $("board").addEventListener(ev, () => clearTimeout(pressTimer)),
);
$("board").addEventListener(
  "click",
  (e) => {
    if (longPressed) {
      e.stopPropagation();
      longPressed = false;
    }
  },
  true,
);
document
  .querySelectorAll(".levels [data-n]")
  .forEach((b) => b.addEventListener("click", () => newGame({ n: Number(b.dataset.n) })));
$("newBtn").onclick = () => newGame({ n: state.n });
$("restartBtn").onclick = () => {
  lastPlacedCatIndex = -1;
  clearAutoMarks();
  state.cells = new Array(state.n * state.n).fill(0);
  state.lives = 3;
  state.elapsed = 0;
  state.done = false;
  state.history = [];
  state.autoMarked = new Set();
  $("timer").textContent = "00:00";
  startTimer();
  paintCells();
  saveResume();
};
$("undoBtn").onclick = () => {
  const last = state.history.pop();
  if (!last) return;
  state.cells = last.cells;
  state.lives = last.lives;
  state.autoMarked = new Set(last.autoMarked);
  lastPlacedCatIndex = -1;
  refreshLastPlacedCatIndex();
  paintCells();
  saveResume();
};
$("modeMarkBtn").onclick = () => setMode("mark");
$("modeCatBtn").onclick = () => setMode("cat");
$("hintBtn").onclick = giveHint;
$("autoXBtn").onclick = () => {
  state.autoX = !state.autoX;
  localStorage.setItem(LS.autoX, state.autoX ? "1" : "0");
  $("autoXBtn").classList.toggle("on", state.autoX);
  $("autoXBtn").textContent = state.autoX ? "自動打叉" : "自動打叉：關";
  if (!state.autoX) {
    clearAutoMarks();
    paintCells();
  }
};
$("dailyBtn").onclick = () => newGame({ n: 7, daily: true, seed: hashSeed(todayKey()) });
$("skinBtn").onclick = () => {
  getSkinAudioContext();
  if (!skinSelecting && !getSkinCooldownRemaining()) showSkinPicker();
};
$("overlayBody").addEventListener("click", async (e) => {
  const button = e.target.closest("[data-skin]");
  if (!button || skinSelecting || getSkinCooldownRemaining()) return;
  skinSelecting = true;
  const selected = button.dataset.skin;
  getSkinAudioContext();
  try {
    const target = await animateSkinToLastCat(button, selected);
    state.skin = selected;
    localStorage.setItem(LS.skin, state.skin);
    paintCells();
    const current = {
      ...target,
      cell: target.index >= 0 ? $("board").children[target.index] : null,
    };
    animateSkinArrival(current);
    animateBoardCats(target.index);
    startSkinCooldown();
  } catch (err) {
    console.error("換貓動畫失敗", err);
    unlockView();
    clearSkinEffects();
    state.skin = selected;
    localStorage.setItem(LS.skin, state.skin);
    paintCells();
    hideSheet();
    startSkinCooldown();
  } finally {
    setTimeout(() => (skinSelecting = false), 220);
    setTimeout(clearSkinEffects, 1100);
  }
});
document.addEventListener("keydown", (e) => {
  if (!puzzleActive || state.done || e.target.closest?.("input,select,textarea")) return;
  const n = state.n,
    [r, c] = rowColOf(n, state.cursor);
  if (e.key === "ArrowLeft") {
    state.cursor = indexOf(n, r, Math.max(0, c - 1));
    paintCells();
    e.preventDefault();
  } else if (e.key === "ArrowRight") {
    state.cursor = indexOf(n, r, Math.min(n - 1, c + 1));
    paintCells();
    e.preventDefault();
  } else if (e.key === "ArrowUp") {
    state.cursor = indexOf(n, Math.max(0, r - 1), c);
    paintCells();
    e.preventDefault();
  } else if (e.key === "ArrowDown") {
    state.cursor = indexOf(n, Math.min(n - 1, r + 1), c);
    paintCells();
    e.preventDefault();
  } else if (/[xX]/.test(e.key)) {
    setMode("mark");
    tapCell(state.cursor);
  } else if (/[cC]/.test(e.key)) {
    setMode("cat");
    tapCell(state.cursor);
  } else if (e.key === "Backspace" || e.key === "Delete") {
    clearCell(state.cursor);
    e.preventDefault();
  } else if (/[hH]/.test(e.key)) giveHint();
});
window.__meowdoku = {
  state,
  newGame,
  tapCell,
  clearCell,
  setMode,
  giveHint,
  catsOnBoard,
  board: () => $("board"),
  todayKey,
};
export function setSkin(key) {
  state.skin = key;
  localStorage.setItem(LS.skin, key);
  if (state.cells.length) paintCells();
}
// 進出謎題畫面：離開時暫停計時、停用鍵盤
export function enterPuzzle() {
  puzzleActive = true;
  if (!state.cells.length) newGame({ n: 5 });
  else if (state.daily && state.dailyKey !== todayKey()) newGame({ n: 5 });
  else if (!state.done) startTimer();
}
export function leavePuzzle() {
  puzzleActive = false;
  clearInterval(state.timer);
  saveResume();
}
export function initPuzzle(skin) {
  state.skin = skin;
  const autoX = localStorage.getItem(LS.autoX);
  state.autoX = autoX === null ? true : autoX === "1";
  $("autoXBtn").classList.toggle("on", state.autoX);
  $("autoXBtn").textContent = state.autoX ? "自動打叉" : "自動打叉：關";
  setMode(localStorage.getItem("meowdoku.mode") === "cat" ? "cat" : "mark");
  if (loadResume()) clearInterval(state.timer);
  updateSkinCooldownButton();
}
