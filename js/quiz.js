// quiz.js — 學院測驗題庫：標準格式、驗證、抽題、結算（純函式＋讀檔，瀏覽器與 Node 共用）
// 題庫放在 quizzes/<學科>.json，格式說明見 quizzes/README.md
export const FORMAT_VERSION = 1;

// 每種題型：validate 檢查題目欄位、isCorrect 判定作答。新增題型在這裡加一項，再到 js/academy.js 加畫面。
export const QUESTION_TYPES = {
  choice: {
    validate: (q) =>
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
      q.options.length <= 4 && // 畫面以 A～D 標示
      q.options.every((o) => typeof o === "string" && o.trim()) &&
      new Set(q.options).size === q.options.length &&
      Number.isInteger(q.answer) &&
      q.answer >= 0 &&
      q.answer < q.options.length,
    isCorrect: (q, response) => response === q.answer,
  },
};

const nonEmpty = (v) => typeof v === "string" && v.trim().length > 0;

// 程度（年級）：4=國小四年級、5=國小五年級、6=國小六年級、7=國中（七年級以上）
export const GRADES = [
  { grade: 4, label: "小四", full: "國小四年級" },
  { grade: 5, label: "小五", full: "國小五年級" },
  { grade: 6, label: "小六", full: "國小六年級" },
  { grade: 7, label: "國中", full: "國中（七年級以上）" },
];
export const GRADE_MIN = 4;
export const GRADE_MAX = 7;
export function gradeInfo(grade) {
  return GRADES.find((g) => g.grade === grade) || { grade, label: `G${grade}`, full: `程度 ${grade}` };
}
export function gradeLabel(grade) {
  return gradeInfo(grade).label;
}
// 程度獎勵倍率：程度越高，同樣表現獲得的能力值與金幣越多（國小中年級較少、國中較多）
const GRADE_REWARD = { 4: 0.85, 5: 1, 6: 1.15, 7: 1.3 };
export function gradeRewardMul(grade) {
  return GRADE_REWARD[grade] ?? 1;
}
// 各程度的題數，例如 { 4: 6, 5: 8, 6: 6, 7: 6 }
export function gradeCounts(subject) {
  const counts = {};
  for (const { grade } of GRADES) counts[grade] = 0;
  for (const q of subject?.questions || []) if (counts[q.grade] !== undefined) counts[q.grade]++;
  return counts;
}

// ===== 冊次（年級＋學期）與教科書版本 =====
// 台灣國小/國中教科書都依同一份 108 課綱編寫，各版本（康軒/南一/翰林）內容範圍相同，
// 差別是同一主題排在幾年級上/下學期的第幾單元。題目的 term／versions 就是在記錄這件事。
export const TERMS = [
  { key: "4-1", label: "四上", grade: 4, term: 1, full: "國小四年級上學期" },
  { key: "4-2", label: "四下", grade: 4, term: 2, full: "國小四年級下學期" },
  { key: "5-1", label: "五上", grade: 5, term: 1, full: "國小五年級上學期" },
  { key: "5-2", label: "五下", grade: 5, term: 2, full: "國小五年級下學期" },
  { key: "6-1", label: "六上", grade: 6, term: 1, full: "國小六年級上學期" },
  { key: "6-2", label: "六下", grade: 6, term: 2, full: "國小六年級下學期" },
  { key: "7-1", label: "七上", grade: 7, term: 1, full: "國中七年級上學期" },
  { key: "7-2", label: "七下", grade: 7, term: 2, full: "國中七年級下學期" },
];
export const PUBLISHERS = ["康軒", "南一", "翰林", "何嘉仁", "佳音"];
// 各科實際流通的版本（依教育部「教科用書審查通過清單」）：
// 國小英語＝康軒 Wonder World／翰林 Here We Go／何嘉仁 Super Fun（南一沒有國小英語）；
// 國中英語＝康軒／南一／佳音；其餘科目（國語、數學、自然、社會）＝康軒／南一／翰林。
export const SUBJECT_PUBLISHERS = {
  chinese: ["康軒", "南一", "翰林"],
  math: ["康軒", "南一", "翰林"],
  science: ["康軒", "南一", "翰林"],
  social: ["康軒", "南一", "翰林"],
  english: ["康軒", "翰林", "何嘉仁", "南一", "佳音"],
};
export const ALL_VERSIONS = "共通"; // 所有版本都有此內容
export function termInfo(key) {
  return TERMS.find((t) => t.key === key) || null;
}
export function termsOfGrade(grade) {
  return TERMS.filter((t) => t.grade === Number(grade));
}
// 題目是否符合指定的冊次／版本。
// - 沒標 term／terms 的舊題視為該年級兩學期皆可；沒標 versions／terms 或標「共通」＝所有版本都有。
// - terms = { 版本: 冊次 }：同一題在不同版本屬於不同冊次時使用（例：水溶液在康軒是六上、翰林是五上）。
export function questionTerm(q, publisher) {
  if (q && q.terms && typeof q.terms === "object") {
    if (publisher) return q.terms[publisher] || null;
    return null; // 沒指定版本時要看任一版本是否落在該冊次
  }
  return q?.term || null;
}
export function matchesFilter(q, { grade = null, term = null, publisher = null } = {}) {
  if (grade !== null && grade !== undefined && Number(q.grade) !== Number(grade)) return false;
  if (term) {
    const t = termInfo(term);
    if (!t) return false;
    if (q.terms && typeof q.terms === "object") {
      const values = Object.values(q.terms);
      if (publisher) {
        if (q.terms[publisher] !== term) return false;
      } else if (!values.includes(term)) return false;
    } else if (q.term) {
      if (q.term !== term) return false;
    } else if (Number(q.grade) !== t.grade) return false;
  }
  if (publisher) {
    const list = q.terms && typeof q.terms === "object" ? Object.keys(q.terms) : Array.isArray(q.versions) ? q.versions : null;
    if (list && list.length && !list.includes(ALL_VERSIONS) && !list.includes(publisher)) return false;
  }
  return true;
}
// 各冊次的題數（可再依版本過濾）
export function termCounts(subject, { publisher = null } = {}) {
  const counts = {};
  for (const { key } of TERMS) counts[key] = 0;
  for (const q of subject?.questions || []) {
    for (const { key } of TERMS) {
      if (matchesFilter(q, { term: key, publisher })) counts[key]++;
    }
  }
  return counts;
}
// 各版本的題數（可再依冊次過濾）
export function publisherCounts(subject, { term = null } = {}) {
  const counts = {};
  for (const p of PUBLISHERS) counts[p] = 0;
  for (const q of subject?.questions || []) {
    for (const p of PUBLISHERS) if (matchesFilter(q, { term, publisher: p })) counts[p]++;
  }
  return counts;
}
// 符合指定條件的題數
export function filterCount(subject, filter = {}) {
  return (subject?.questions || []).filter((q) => matchesFilter(q, filter)).length;
}

// 回傳錯誤訊息陣列；空陣列代表題庫合法
export function validateSubject(subject) {
  const errors = [];
  if (!subject || typeof subject !== "object") return ["題庫不是物件"];
  if (subject.format !== FORMAT_VERSION) errors.push(`format 必須是 ${FORMAT_VERSION}`);
  for (const key of ["id", "name", "icon", "statName", "desc"])
    if (!nonEmpty(subject[key])) errors.push(`缺少 ${key}`);
  if (subject.id && !/^[a-z0-9-]+$/.test(subject.id)) errors.push("id 只能用小寫英數與 -");
  for (const key of ["color", "bgLight"])
    if (!/^#[0-9a-f]{6}$/i.test(subject[key] || "")) errors.push(`${key} 必須是 #rrggbb`);
  const questions = Array.isArray(subject.questions) ? subject.questions : [];
  if (!questions.length) errors.push("questions 不能是空的");
  if (!Number.isInteger(subject.roundSize) || subject.roundSize < 1 || subject.roundSize > questions.length)
    errors.push("roundSize 必須是 1～題數 的整數");
  const ids = new Set();
  questions.forEach((q, i) => {
    const at = `第 ${i + 1} 題${q?.id ? `（${q.id}）` : ""}`;
    if (!nonEmpty(q?.id)) errors.push(`${at} 缺少 id`);
    else if (ids.has(q.id)) errors.push(`${at} id 重複`);
    else ids.add(q.id);
    if (!nonEmpty(q?.prompt)) errors.push(`${at} 缺少 prompt`);
    if (!nonEmpty(q?.explain)) errors.push(`${at} 缺少 explain`);
    if (q?.tip !== undefined && !nonEmpty(q.tip)) errors.push(`${at} tip 若有填就不能空白`);
    if (!Number.isInteger(q?.grade) || q.grade < GRADE_MIN || q.grade > GRADE_MAX)
      errors.push(`${at} grade 必須是 ${GRADE_MIN}～${GRADE_MAX} 的整數（程度）`);
    // term／terms 記的是「教科書實際放在哪一冊」，可能與題庫的程度標籤不同年級
    // （例：三角形內角和編在五上，但題庫把它標成小四），所以只檢查是不是合法冊次。
    if (q?.term !== undefined && !termInfo(q.term))
      errors.push(`${at} term 必須是合法冊次（例如 5-1、5-2）`);
    if (q?.terms !== undefined) {
      const okTerms =
        q.terms &&
        typeof q.terms === "object" &&
        !Array.isArray(q.terms) &&
        Object.keys(q.terms).length > 0 &&
        Object.entries(q.terms).every(([p, v]) => PUBLISHERS.includes(p) && termInfo(v));
      if (!okTerms) errors.push(`${at} terms 必須是 { 版本: 冊次 } 的對照表（例：{"康軒":"6-1","翰林":"5-1"}）`);
      if (q?.term !== undefined) errors.push(`${at} term 與 terms 只能擇一`);
    }
    if (q?.versions !== undefined) {
      const okVersions =
        Array.isArray(q.versions) &&
        q.versions.length > 0 &&
        q.versions.every((v) => v === ALL_VERSIONS || PUBLISHERS.includes(v));
      if (!okVersions) errors.push(`${at} versions 必須是 ${PUBLISHERS.join("/")} 或 ${ALL_VERSIONS} 的陣列`);
    }
    const type = QUESTION_TYPES[q?.type];
    if (!type) errors.push(`${at} 未知題型 ${q?.type}`);
    else if (!type.validate(q)) errors.push(`${at} ${q.type} 欄位不合法`);
  });
  return errors;
}

export function isCorrect(question, response) {
  return QUESTION_TYPES[question.type].isCorrect(question, response);
}

// 學科表（id → 題庫），由 loadSubjects() 填入；保留插入順序＝學院卡片順序
export const QUIZ_SUBJECTS = {};

// 讀 quizzes/index.json 列出的學科；格式不合法的題庫略過並在主控台報錯
export async function loadSubjects(base = "./quizzes/") {
  const index = await fetch(`${base}index.json`).then((r) => r.json());
  const subjects = await Promise.all(
    index.subjects.map((file) =>
      fetch(base + file)
        .then((r) => r.json())
        .catch(() => null),
    ),
  );
  subjects.forEach((subject, i) => {
    const errors = validateSubject(subject);
    if (errors.length) console.error(`題庫 ${index.subjects[i]} 格式錯誤`, errors);
    else QUIZ_SUBJECTS[subject.id] = subject;
  });
  return QUIZ_SUBJECTS;
}

// 教科書單元對照表：quizzes/units.json
// 結構：{ version: "114學年度", subjects: { math: { name, sources: [...], units: [{publisher, term:"5-1", unit_no, unit_name, sub_units}] } } }
export const TEXTBOOK_UNITS = { version: null, subjects: {} };
export async function loadUnits(base = "./quizzes/") {
  try {
    const data = await fetch(`${base}units.json`).then((r) => r.json());
    TEXTBOOK_UNITS.version = data.version || null;
    TEXTBOOK_UNITS.subjects = data.subjects || {};
  } catch {
    /* 沒有對照表也能玩：只是不顯示單元清單 */
  }
  return TEXTBOOK_UNITS;
}
export function unitsFor(subjectId, publisher, term) {
  const units = TEXTBOOK_UNITS.subjects[subjectId]?.units || [];
  if (!publisher || !term) return [];
  return units.filter((u) => u.publisher === publisher && u.term === term);
}

// ===== 錯題本 =====
export const MISTAKE_LIMIT = 120;
export function mistakeKey(subjectId, questionId) {
  return `${subjectId}:${questionId}`;
}
// 記錄一題錯題：同一題只留最新一次、最新在前、最多 MISTAKE_LIMIT 筆
export function recordMistake(list, entry) {
  const old = Array.isArray(list) ? list : [];
  if (!entry?.subjectId || !entry?.questionId) return old;
  const key = mistakeKey(entry.subjectId, entry.questionId);
  const rest = old.filter((e) => mistakeKey(e.subjectId, e.questionId) !== key);
  return [{ ...entry }, ...rest].slice(0, MISTAKE_LIMIT);
}
export function mistakeCounts(list) {
  const counts = {};
  for (const e of Array.isArray(list) ? list : []) counts[e.subjectId] = (counts[e.subjectId] || 0) + 1;
  return counts;
}
export function mistakesFor(list, subjectId) {
  return (Array.isArray(list) ? list : []).filter((e) => e.subjectId === subjectId);
}
// 從錯題本挑出可重練的題目（題目若已被刪除就跳過），依錯題新到舊排序
export function mistakesToQuestions(list, subject, limit = 3) {
  const byId = new Map((subject?.questions || []).map((q) => [q.id, q]));
  const seen = new Set();
  const out = [];
  for (const e of mistakesFor(list, subject?.id)) {
    const q = byId.get(e.questionId);
    if (!q || seen.has(q.id)) continue;
    seen.add(q.id);
    out.push(q);
    if (out.length >= limit) break;
  }
  return out;
}

// ── 錯題本匯出／匯入（備份、換裝置或跟同學交換）──
export function exportMistakes(list, now = new Date()) {
  return JSON.stringify(
    {
      app: "meowdoku",
      kind: "mistakes",
      version: 1,
      exportedAt: now.toISOString(),
      mistakes: Array.isArray(list) ? list : [],
    },
    null,
    2,
  );
}
export function importMistakes(text, existing = []) {
  let data;
  try {
    data = JSON.parse(String(text ?? "").trim());
  } catch {
    return { error: "這不是有效的 JSON 檔，請確認貼上／選擇的是匯出的錯題本檔案。" };
  }
  const incoming = Array.isArray(data) ? data : data?.mistakes;
  if (!Array.isArray(incoming)) return { error: "檔案裡找不到錯題清單（mistakes）。" };
  let list = Array.isArray(existing) ? [...existing] : [];
  const keys = new Set(list.map((e) => mistakeKey(e.subjectId, e.questionId)));
  let added = 0;
  let updated = 0;
  let skipped = 0;
  for (const e of incoming) {
    if (!e || typeof e !== "object" || !e.subjectId || !e.questionId) {
      skipped++;
      continue;
    }
    const key = mistakeKey(e.subjectId, e.questionId);
    list = recordMistake(list, {
      subjectId: String(e.subjectId),
      questionId: String(e.questionId),
      term: typeof e.term === "string" ? e.term : "",
      publisher: typeof e.publisher === "string" ? e.publisher : "",
      chosen: Number.isInteger(e.chosen) ? e.chosen : -1,
      at: Number.isFinite(e.at) ? e.at : Date.now(),
    });
    if (keys.has(key)) updated++;
    else {
      keys.add(key);
      added++;
    }
  }
  return { list, added, updated, skipped };
}

// 考試（期中考／期末考）：從某個冊次跨科目抽題
export function buildExamQuestions(term, count, rng = Math.random) {
  const pool = [];
  for (const subject of Object.values(QUIZ_SUBJECTS)) {
    for (const q of subject.questions || []) {
      if (matchesFilter(q, { term })) pool.push({ ...q, examSubject: subject.id });
    }
  }
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// 從題庫隨機抽一輪（Fisher–Yates，不重複）。
// filter 可帶 { grade, term, publisher }；第二個參數也接受單純的年級數字（舊用法）。
// 依條件篩選後題數不足時，依序退回「同年級」→「整冊」，避免抽不到題。
export function pickRound(subject, filter = {}, rng = Math.random) {
  const f = typeof filter === "number" ? { grade: filter } : filter || {};
  const all = subject.questions || [];
  let pool = all.filter((q) => matchesFilter(q, f));
  if (!pool.length && (f.grade ?? f.term)) {
    const grade = f.grade ?? termInfo(f.term)?.grade;
    pool = all.filter((q) => Number(q.grade) === Number(grade));
  }
  if (!pool.length) pool = [...all];
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(subject.roundSize, shuffled.length));
}

// 測驗結算與獎勵計算（grade 為程度，影響金幣與能力值倍率）
export function calculateQuizResult(subjectId, correctCount, totalCount, grade = null) {
  const pass = correctCount >= Math.ceil(totalCount * 0.6);
  const perfect = correctCount === totalCount;
  const mul = grade ? gradeRewardMul(grade) : 1;

  // 基礎金幣獎勵 (滿分 150，合格 90，未達標 30)，再依程度加成
  const baseCoins = perfect ? 150 : pass ? 90 : 30;
  // 學科屬性值增長 (+6~+15)，再依程度加成
  const baseStat = perfect ? 12 : pass ? 7 : 2;
  const coins = Math.round(baseCoins * mul);
  const statGain = Math.max(1, Math.round(baseStat * mul));
  // 經驗值
  const xpGain = correctCount * 30;
  // 消耗體力與飽食度（程度越高越耗體力）
  const staminaCost = Math.round(15 * (grade ? Math.max(0.8, mul) : 1));
  const hungerCost = 10;
  const fatigueGain = 12;

  // 隨機掉落獎勵
  let dropItem = null;
  const rand = Math.random();
  if (perfect && rand < 0.4) {
    dropItem = { type: "ticket_scrap", name: "🎫 扭蛋券殘頁", qty: 1 };
  } else if (pass && rand < 0.3) {
    dropItem = { type: "premium_snack", name: "🥫 特級營養罐", qty: 1 };
  } else if (rand < 0.2) {
    dropItem = { type: "fish_cookie", name: "🐟 小魚餅乾", qty: 2 };
  }

  return {
    subjectId,
    grade,
    rewardMul: mul,
    correctCount,
    totalCount,
    pass,
    perfect,
    score: Math.round((correctCount / totalCount) * 100),
    coins,
    statGain,
    xpGain,
    staminaCost,
    hungerCost,
    fatigueGain,
    dropItem,
  };
}
