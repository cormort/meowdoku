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

// 從題庫隨機抽一輪（Fisher–Yates，不重複）。
// grade 有給就只從該程度的題目抽；該程度題數不足時退回全部題目，避免抽不到題。
export function pickRound(subject, grade = null, rng = Math.random) {
  const all = subject.questions || [];
  const byGrade = grade ? all.filter((q) => q.grade === grade) : [];
  const src = byGrade.length ? byGrade : all;
  const pool = [...src];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(subject.roundSize, pool.length));
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
