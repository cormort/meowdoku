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

// 從題庫隨機抽一輪（Fisher–Yates，不重複）
export function pickRound(subject, rng = Math.random) {
  const pool = [...subject.questions];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, subject.roundSize);
}

// 測驗結算與獎勵計算
export function calculateQuizResult(subjectId, correctCount, totalCount) {
  const pass = correctCount >= Math.ceil(totalCount * 0.6);
  const perfect = correctCount === totalCount;

  // 基礎金幣獎勵 (滿分 150，合格 90，未達標 30)
  const baseCoins = perfect ? 150 : pass ? 90 : 30;
  // 學科屬性值增長 (+6~+15)
  const statGain = perfect ? 12 : pass ? 7 : 2;
  // 經驗值
  const xpGain = correctCount * 30;
  // 消耗體力與飽食度
  const staminaCost = 15;
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
    correctCount,
    totalCount,
    pass,
    perfect,
    score: Math.round((correctCount / totalCount) * 100),
    coins: baseCoins,
    statGain,
    xpGain,
    staminaCost,
    hungerCost,
    fatigueGain,
    dropItem,
  };
}
