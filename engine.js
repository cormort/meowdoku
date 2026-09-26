// engine.js — 貓咪邏輯謎題核心（純邏輯、零依賴，瀏覽器與 Node 皆可執行）
//
// 規則（與 Meowdoku 相同）：
//   1. 棋盤 N×N 切成 N 個連通色塊，每個色塊恰好放 1 隻貓
//   2. 每一列、每一行恰好 1 隻貓
//   3. 兩隻貓不得相鄰（含斜角）
//   4. 每題唯一解，且純靠邏輯推導即可解完（不需要猜）

// ---------- 亂數（可重現，供每日挑戰與測試使用） ----------

export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(text) {
  let h = 2166136261 >>> 0;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }
function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- 幾何 ----------

export function indexOf(n, row, col) { return row * n + col; }

export function rowColOf(n, idx) { return [Math.floor(idx / n), idx % n]; }

export function orthoNeighbors(n, idx) {
  const [r, c] = rowColOf(n, idx);
  const out = [];
  if (r > 0) out.push(idx - n);
  if (r < n - 1) out.push(idx + n);
  if (c > 0) out.push(idx - 1);
  if (c < n - 1) out.push(idx + 1);
  return out;
}

export function aroundNeighbors(n, idx) {
  const [r, c] = rowColOf(n, idx);
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n) out.push(nr * n + nc);
    }
  }
  return out;
}

// ---------- 產生合法解 ----------
// 合法解等價於「排列 π，且相鄰兩列的欄位差 ≥ 2」（差 1 就是斜角相鄰）。
// 用隨機回溯取樣；n=5 只有 2 種排列（A002464），因此 5×5 的變化來自色塊切法。

export function generateSolution(n, rng) {
  const usedCols = new Array(n).fill(false);
  const perm = new Array(n).fill(-1);
  const order = shuffle([...Array(n).keys()], rng);

  function place(row) {
    if (row === n) return true;
    const candidates = shuffle(order.filter((c) => {
      if (usedCols[c]) return false;
      if (row > 0 && Math.abs(c - perm[row - 1]) < 2) return false;
      return true;
    }), rng);
    for (const c of candidates) {
      perm[row] = c; usedCols[c] = true;
      if (place(row + 1)) return true;
      usedCols[c] = false; perm[row] = -1;
    }
    return false;
  }

  return place(0) ? perm.slice() : null;
}

// ---------- 色塊切分（每個色塊恰好含 1 隻貓、彼此連通） ----------
// chunkiness 0 = 隨機成長（色塊形狀不規則、較難）；1 = 偏好緊實（較簡單）

export function growRegions(n, solution, rng, chunkiness = 0.5) {
  const total = n * n;
  const owner = new Int16Array(total).fill(-1);
  const size = new Int32Array(n);
  const catCells = solution.map((c, r) => indexOf(n, r, c));

  catCells.forEach((cell, region) => { owner[cell] = region; size[region] = 1; });

  let frontier = [];
  const pushFrontier = (cell, region) => {
    for (const nb of orthoNeighbors(n, cell)) {
      if (owner[nb] < 0) frontier.push({ cell: nb, region });
    }
  };
  catCells.forEach((cell, region) => pushFrontier(cell, region));

  const maxSize = n + 1;   // 先限制大小以求平衡
  let guard = total * 40;

  while (frontier.length && guard-- > 0) {
    let pickIdx;
    if (rng() < chunkiness) {
      // 挑「同色塊鄰居最多」的格子 → 色塊較方正
      let bestScore = -1;
      const sample = Math.min(frontier.length, 12);
      for (let i = 0; i < sample; i++) {
        const cand = frontier[Math.floor(rng() * frontier.length)];
        const score = orthoNeighbors(n, cand.cell).filter((nb) => owner[nb] === cand.region).length;
        if (score > bestScore) { bestScore = score; pickIdx = frontier.indexOf(cand); }
      }
      if (pickIdx === undefined) pickIdx = Math.floor(rng() * frontier.length);
    } else {
      pickIdx = Math.floor(rng() * frontier.length);
    }

    const { cell, region } = frontier.splice(pickIdx, 1)[0];
    if (owner[cell] >= 0 || size[region] >= maxSize) continue;
    owner[cell] = region;
    size[region] += 1;
    pushFrontier(cell, region);
  }

  // 保底：拿掉大小限制繼續長。因為上限階段的註記可能被丟掉（該格只剩已滿色塊可長），
  // 這裡用「重新掃描整條邊界」而不是沿用舊 frontier，才不會留下孤島。
  const rebuildFrontier = () => {
    frontier = [];
    for (let i = 0; i < total; i++) {
      if (owner[i] < 0) continue;
      for (const nb of orthoNeighbors(n, i)) {
        if (owner[nb] < 0) frontier.push({ cell: nb, region: owner[i] });
      }
    }
  };

  guard = total * 60;
  while (guard-- > 0) {
    if (!frontier.length) {
      if (!owner.includes(-1)) break;
      rebuildFrontier();
      if (!frontier.length) break;      // 真的沒有可生長的邊界 → 放棄
    }
    const { cell, region } = frontier.splice(Math.floor(rng() * frontier.length), 1)[0];
    if (owner[cell] >= 0) continue;
    owner[cell] = region;
    size[region] += 1;
    pushFrontier(cell, region);
  }

  if (owner.includes(-1)) return null;
  return { owner: Array.from(owner), size: Array.from(size) };
}

export function regionIsConnected(n, owner, region) {
  const cells = owner.map((v, i) => (v === region ? i : -1)).filter((i) => i >= 0);
  if (!cells.length) return false;
  const seen = new Set([cells[0]]);
  const queue = [cells[0]];
  while (queue.length) {
    const cur = queue.shift();
    for (const nb of orthoNeighbors(n, cur)) {
      if (owner[nb] === region && !seen.has(nb)) { seen.add(nb); queue.push(nb); }
    }
  }
  return seen.size === cells.length;
}

// ---------- 精確解題器（可數解，用來驗證唯一解） ----------

export function buildMasks(n, owner) {
  // 每個格子的「衝突集合」：同列、同行、同色塊、以及周圍 8 格（含自己）
  const conflicts = [];
  for (let i = 0; i < n * n; i++) {
    const set = new Set([i]);
    const [r, c] = rowColOf(n, i);
    for (let cc = 0; cc < n; cc++) set.add(indexOf(n, r, cc));
    for (let rr = 0; rr < n; rr++) set.add(indexOf(n, rr, c));
    for (let j = 0; j < n * n; j++) if (owner[j] === owner[i]) set.add(j);
    for (const nb of aroundNeighbors(n, i)) set.add(nb);
    conflicts.push(set);
  }
  return conflicts;
}

export function countSolutions(n, owner, limit = 2, conflicts = null) {
  const mask = conflicts || buildMasks(n, owner);
  const regionMap = new Map();
  for (let i = 0; i < n * n; i++) {
    if (!regionMap.has(owner[i])) regionMap.set(owner[i], []);
    regionMap.get(owner[i]).push(i);
  }
  const regions = [...regionMap.entries()];

  const allowed = new Uint8Array(n * n).fill(1);
  const catRow = new Array(n).fill(-1);
  const catCol = new Array(n).fill(-1);
  const regionCat = new Map();
  let solutions = 0;

  function place(cell) {
    for (const j of mask[cell]) allowed[j] = 0;
    allowed[cell] = 1;                       // 已放的貓本身維持 allowed，才不會誤判該行／列／色塊「沒有候選」
    const r = Math.floor(cell / n), c = cell % n;
    catRow[r] = c; catCol[c] = r;
    regionCat.set(owner[cell], cell);
  }

  const snapshot = () => ({
    allowed: Uint8Array.from(allowed),
    catRow: catRow.slice(),
    catCol: catCol.slice(),
    regionCat: new Map(regionCat),
  });

  function restore(s) {
    allowed.set(s.allowed);
    for (let i = 0; i < n; i++) { catRow[i] = s.catRow[i]; catCol[i] = s.catCol[i]; }
    regionCat.clear();
    for (const [k, v] of s.regionCat) regionCat.set(k, v);
  }

  function search(placed) {
    if (solutions >= limit) return;
    if (placed === n) { solutions++; return; }
    const snap = snapshot();

    // 傳播：只針對「還沒被滿足」的行／列／色塊；只剩一個候選就直接放貓
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (let r = 0; r < n; r++) {
        if (catRow[r] >= 0) continue;
        const cands = [];
        for (let c = 0; c < n; c++) { const cell = r * n + c; if (allowed[cell]) cands.push(cell); }
        if (!cands.length) { restore(snap); return; }
        if (cands.length === 1) { place(cands[0]); placed++; progressed = true; }
      }
      for (let c = 0; c < n; c++) {
        if (catCol[c] >= 0) continue;
        const cands = [];
        for (let r = 0; r < n; r++) { const cell = r * n + c; if (allowed[cell]) cands.push(cell); }
        if (!cands.length) { restore(snap); return; }
        if (cands.length === 1) { place(cands[0]); placed++; progressed = true; }
      }
      for (const [rid, cells] of regions) {
        if (regionCat.has(rid)) continue;
        const cands = cells.filter((i) => allowed[i]);
        if (!cands.length) { restore(snap); return; }
        if (cands.length === 1) { place(cands[0]); placed++; progressed = true; }
      }
      if (placed === n) { solutions++; restore(snap); return; }
    }

    // 分支：挑候選最少的未滿足色塊（MRV）
    let best = null;
    for (const [rid, cells] of regions) {
      if (regionCat.has(rid)) continue;
      const cands = cells.filter((i) => allowed[i]);
      if (!cands.length) { restore(snap); return; }
      if (!best || cands.length < best.length) best = cands;
    }
    if (!best) { restore(snap); return; }

    for (const cell of best) {
      if (!allowed[cell]) continue;
      const local = snapshot();
      place(cell);
      search(placed + 1);
      restore(local);
      if (solutions >= limit) break;
    }
    restore(snap);
  }

  search(0);
  return solutions;
}

// ---------- 純邏輯解題器（不做任何猜測） ----------
// 技巧：色塊唯一候選、行列唯一候選、色塊被限制在同一行列時排除其他格

export function logicSolve(n, owner, { collect = false } = {}) {
  const mask = buildMasks(n, owner);
  const allowed = new Uint8Array(n * n).fill(1);
  const cats = [];
  const techniques = [];
  const regionCells = new Map();
  for (let i = 0; i < n * n; i++) {
    if (!regionCells.has(owner[i])) regionCells.set(owner[i], []);
    regionCells.get(owner[i]).push(i);
  }
  const cellsOfRegion = [...regionCells.values()];

  const placeCat = (cell, why) => {
    for (const j of mask[cell]) allowed[j] = 0;
    allowed[cell] = 1;
    cats.push(cell);
    if (collect) techniques.push({ cell, why });
  };

  let progress = true;
  let rounds = 0;
  let contradiction = false;

  while (progress && cats.length < n && !contradiction) {
    progress = false;
    rounds++;

    for (const cells of cellsOfRegion) {
      const cands = cells.filter((i) => allowed[i]);
      if (!cands.length) { contradiction = true; break; }
      if (cands.length === 1 && !cats.includes(cands[0])) {
        placeCat(cands[0], 'region');
        progress = true;
      }
    }
    if (contradiction) break;

    for (let r = 0; r < n; r++) {
      const cands = [];
      for (let c = 0; c < n; c++) if (allowed[indexOf(n, r, c)]) cands.push(indexOf(n, r, c));
      if (!cands.length) { contradiction = true; break; }
      if (cands.length === 1 && !cats.includes(cands[0])) { placeCat(cands[0], 'row'); progress = true; }
    }
    if (contradiction) break;

    for (let c = 0; c < n; c++) {
      const cands = [];
      for (let r = 0; r < n; r++) if (allowed[indexOf(n, r, c)]) cands.push(indexOf(n, r, c));
      if (!cands.length) { contradiction = true; break; }
      if (cands.length === 1 && !cats.includes(cands[0])) { placeCat(cands[0], 'col'); progress = true; }
    }
    if (contradiction) break;

    // 色塊候選全在同一列／同一行 → 該列／行的其他格排除
    for (const cells of cellsOfRegion) {
      const cands = cells.filter((i) => allowed[i]);
      if (cands.length < 2) continue;
      const rows = new Set(cands.map((i) => Math.floor(i / n)));
      const cols = new Set(cands.map((i) => i % n));
      if (rows.size === 1) {
        const r = [...rows][0];
        for (let c = 0; c < n; c++) {
          const cell = indexOf(n, r, c);
          if (allowed[cell] && !cells.includes(cell)) { allowed[cell] = 0; progress = true; }
        }
      }
      if (cols.size === 1) {
        const c = [...cols][0];
        for (let r = 0; r < n; r++) {
          const cell = indexOf(n, r, c);
          if (allowed[cell] && !cells.includes(cell)) { allowed[cell] = 0; progress = true; }
        }
      }
    }
  }

  return {
    solved: !contradiction && cats.length === n,
    cats,
    rounds,
    techniques: collect ? techniques : undefined,
  };
}

// ---------- 題目生成（唯一解 ＋ 純邏輯可解） ----------

// ---------- 建構式色塊切分（保證唯一解） ----------
//
// 關鍵：唯一解等於「所有其他合法擺法都被色塊擋掉」。色塊 R 會擋掉擺法 σ 的條件是
// σ 在 R 內有 ≥2 隻貓（一個色塊只能有 1 隻）。因此這裡不是隨機切，而是
// 「把還沒被擋掉的擺法，逐一用指派格子去擋」，最後再用解題器複驗。

// 列出所有滿足「每列每行 1 隻、不得相鄰」的擺法（A002464 數列；n=9 有 5242 種）
const _placementCache = new Map();

export function enumeratePlacements(n, limit = 200000) {
  if (limit === 200000 && _placementCache.has(n)) return _placementCache.get(n);
  const out = [];
  const perm = new Array(n).fill(-1);
  const used = new Array(n).fill(false);
  (function rec(row) {
    if (out.length >= limit) return;
    if (row === n) { out.push(perm.slice()); return; }
    for (let c = 0; c < n; c++) {
      if (used[c]) continue;
      if (row > 0 && Math.abs(c - perm[row - 1]) < 2) continue;
      used[c] = true; perm[row] = c;
      rec(row + 1);
      used[c] = false; perm[row] = -1;
      if (out.length >= limit) return;
    }
  })(0);
  if (limit === 200000) _placementCache.set(n, out);
  return out;
}

function buildUniquePartition(n, solution, rng, { chunkiness = 0.5 } = {}) {
  const total = n * n;
  const catCellOf = solution.map((c, r) => r * n + c);
  const catCells = new Set(catCellOf);
  const owner = new Array(total).fill(-1);
  const size = new Array(n).fill(1);
  catCellOf.forEach((cell, region) => { owner[cell] = region; });

  // 其他合法擺法（扣掉正解），以及「每格可能是哪些擺法的貓位」
  const others = enumeratePlacements(n).filter((perm) => {
    for (let r = 0; r < n; r++) if (perm[r] !== solution[r]) return true;
    return false;
  });
  if (!others.length) return null;

  const cellToPlacements = new Map();      // cell -> [placementIndex...]
  const placementCats = others.map((perm) => perm.map((c, r) => r * n + c));
  placementCats.forEach((cells, pi) => {
    for (const cell of cells) {
      if (!cellToPlacements.has(cell)) cellToPlacements.set(cell, []);
      cellToPlacements.get(cell).push(pi);
    }
  });

  // alive[pi] = 尚未被擋掉；regionCount[pi * n + region] = 該擺法在該色塊內已有幾隻貓
  const alive = new Uint8Array(others.length).fill(1);
  const regionCount = new Uint8Array(others.length * n);
  let aliveCount = others.length;

  const commit = (cell, region) => {
    owner[cell] = region;
    size[region] += 1;
    const list = cellToPlacements.get(cell);
    if (!list) return;
    for (const pi of list) {
      if (!alive[pi]) continue;
      const idx = pi * n + region;
      regionCount[idx] += 1;
      if (regionCount[idx] >= 2) { alive[pi] = 0; aliveCount--; }
    }
  };

  // 已經在色塊裡的擺法貓位（用來估算「還能殺多少」）
  const killGain = (cell, region) => {
    const list = cellToPlacements.get(cell);
    if (!list) return 0;
    let gain = 0;
    for (const pi of list) {
      if (!alive[pi]) continue;
      if (regionCount[pi * n + region] >= 1) gain++;
    }
    return gain;
  };

  let assigned = n;
  let guard = total * 200;

  while (assigned < total && guard-- > 0) {
    const frontier = [];
    for (let i = 0; i < total; i++) {
      if (owner[i] >= 0) continue;
      const adj = [...new Set(orthoNeighbors(n, i).map((nb) => owner[nb]).filter((r) => r >= 0))];
      if (adj.length) frontier.push({ cell: i, regions: adj });
    }
    if (!frontier.length) return null;

    let bestPick = null;
    const sample = Math.min(frontier.length, 14);
    for (let k = 0; k < sample; k++) {
      const cand = frontier[Math.floor(rng() * frontier.length)];
      for (const region of cand.regions) {
        const gain = killGain(cand.cell, region);
        const compact = orthoNeighbors(n, cand.cell).filter((nb) => owner[nb] === region).length;
        // 分數：優先殺掉擺法；chunkiness 高時偏好形狀緊實；
        // 超過平均大小的色塊重扣分，否則單一色塊會吞掉整個盤面、其他色塊只剩 1 格
        const over = Math.max(0, size[region] + 1 - n);
        const score = gain * 10 + compact * (chunkiness * 3) - over * over * 4 + rng();
        if (!bestPick || score > bestPick.score) bestPick = { cell: cand.cell, region, score };
      }
    }
    if (!bestPick) return null;
    commit(bestPick.cell, bestPick.region);
    assigned++;
  }

  if (assigned < total) return null;
  if (aliveCount > 0) return repairPartition(n, solution, owner, size, others, rng);
  return owner;
}

// 貪婪長完仍有少數擺法沒擋掉時：找一個仍成立的擺法，把它某個（非正解）貓位改劃給鄰近色塊，
// 讓它在同一色塊出現兩隻貓而失效；色塊須保持連通且大小不超出範圍
function repairPartition(n, solution, owner, size, others, rng) {
  const catCells = new Set(solution.map((c, r) => r * n + c));
  const maxSize = Math.ceil(n * 1.8);
  const minSize = Math.max(2, Math.floor(n / 3));
  const placements = others.map((perm) => perm.map((c, r) => r * n + c));

  const seen = new Int32Array(n);
  let stamp = 0;
  const isAlive = (cells) => {
    stamp++;
    for (const cell of cells) {
      if (seen[owner[cell]] === stamp) return false;
      seen[owner[cell]] = stamp;
    }
    return true;
  };
  const aliveCount = () => { let k = 0; for (const p of placements) if (isAlive(p)) k++; return k; };

  let alive = aliveCount();
  let guard = n * n;
  while (alive > 0 && guard-- > 0) {
    // 依序嘗試仍成立的其他擺法，直到有一個能找到保持色塊連通的修補步
    let best = null;
    for (const target of shuffle(placements.filter(isAlive), rng).slice(0, 40)) {
      // 候選：把 target 的某個（非正解）貓位改劃到相鄰色塊
      const moves = [];
      for (const cell of target) {
        if (catCells.has(cell)) continue;
        const from = owner[cell];
        for (const nb of orthoNeighbors(n, cell)) {
          const to = owner[nb];
          if (to === from || size[from] <= minSize || size[to] >= maxSize || moves.some((m) => m.cell === cell && m.to === to)) continue;
          moves.push({ cell, from, to });
        }
      }
      for (const m of shuffle(moves, rng)) {
        owner[m.cell] = m.to;
        if (regionIsConnected(n, owner, m.from)) {
          const k = aliveCount();
          if (!best || k < best.k) best = { ...m, k };
        }
        owner[m.cell] = m.from;
      }
      if (best) break;
    }
    if (!best) return null;   // 無步可走 → 換一個正解重來（允許暫時不變好的步，避免卡在局部最佳）
    owner[best.cell] = best.to;
    size[best.from]--; size[best.to]++;
    alive = best.k;
  }
  return alive === 0 ? owner : null;
}

export function generatePuzzle(n, { rng = makeRng(Date.now() >>> 0), chunkiness = 0.5, maxTries = 60 } = {}) {
  const started = Date.now();
  const rejections = { noSolution: 0, notUnique: 0, needsGuess: 0 };
  let tries = 0;

  while (tries < maxTries) {
    tries++;
    const solution = generateSolution(n, rng);
    if (!solution) { rejections.noSolution++; continue; }

    const owner = buildUniquePartition(n, solution, rng, { chunkiness });
    if (!owner) { rejections.notUnique++; continue; }

    // 保險：建構保證唯一，但仍用解題器複驗（避免模型寫錯卻悄悄上線）
    if (countSolutions(n, owner, 2) !== 1) { rejections.notUnique++; continue; }

    const logic = logicSolve(n, owner);
    if (!logic.solved) { rejections.needsGuess++; continue; }

    const sizes = new Map();
    owner.forEach((v) => sizes.set(v, (sizes.get(v) || 0) + 1));
    return {
      n,
      owner,
      solution,
      chunkiness,
      stats: {
        tries,
        ms: Date.now() - started,
        logicRounds: logic.rounds,
        regionMin: Math.min(...sizes.values()),
        regionMax: Math.max(...sizes.values()),
        alternatives: othersCount(n),
      },
    };
  }
  return null;
}

function othersCount(n) {
  const seq = { 4: 0, 5: 2, 6: 14, 7: 90, 8: 646, 9: 5242, 10: 47622 };
  return seq[n] !== undefined ? seq[n] : null;
}

// ---------- 玩家盤面檢查 ----------

export function findConflicts(n, owner, cats) {
  const bad = new Set();
  for (const cell of cats) {
    for (const nb of aroundNeighbors(n, cell)) {
      if (cats.includes(nb)) { bad.add(cell); bad.add(nb); }
    }
    const [r, c] = rowColOf(n, cell);
    if (cats.filter((x) => Math.floor(x / n) === r).length > 1) bad.add(cell);
    if (cats.filter((x) => x % n === c).length > 1) bad.add(cell);
    if (cats.filter((x) => owner[x] === owner[cell]).length > 1) bad.add(cell);
  }
  return bad;
}

export function isSolved(n, owner, cats) {
  if (cats.length !== n) return false;
  const rows = new Set(cats.map((i) => Math.floor(i / n)));
  const cols = new Set(cats.map((i) => i % n));
  const regions = new Set(cats.map((i) => owner[i]));
  if (rows.size !== n || cols.size !== n || regions.size !== n) return false;
  return findConflicts(n, owner, cats).size === 0;
}
