// quiz-format.js — 問答題庫的標準格式（純函式，瀏覽器與 Node 共用；格式說明見 quizzes/README.md）
export const FORMAT_VERSION = 1;

// 每種題型：validate 檢查題目欄位、isCorrect 判定作答。新增題型只要在這裡加一項，再於 quiz.js 加畫面。
export const QUESTION_TYPES = {
  choice: {
    validate: (q) =>
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
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
export function validatePack(pack) {
  const errors = [];
  if (!pack || typeof pack !== "object") return ["題庫不是物件"];
  if (pack.format !== FORMAT_VERSION) errors.push(`format 必須是 ${FORMAT_VERSION}`);
  for (const key of ["id", "title", "icon", "description"])
    if (!nonEmpty(pack[key])) errors.push(`缺少 ${key}`);
  if (pack.id && !/^[a-z0-9-]+$/.test(pack.id)) errors.push("id 只能用小寫英數與 -");
  const questions = Array.isArray(pack.questions) ? pack.questions : [];
  if (!questions.length) errors.push("questions 不能是空的");
  if (!Number.isInteger(pack.roundSize) || pack.roundSize < 1 || pack.roundSize > questions.length)
    errors.push("roundSize 必須是 1～題數 的整數");
  if (!Number.isInteger(pack.passScore) || pack.passScore < 1 || pack.passScore > pack.roundSize)
    errors.push("passScore 必須是 1～roundSize 的整數");
  const ids = new Set();
  questions.forEach((q, i) => {
    const at = `第 ${i + 1} 題${q?.id ? `（${q.id}）` : ""}`;
    if (!nonEmpty(q?.id)) errors.push(`${at} 缺少 id`);
    else if (ids.has(q.id)) errors.push(`${at} id 重複`);
    else ids.add(q.id);
    if (!nonEmpty(q?.prompt)) errors.push(`${at} 缺少 prompt`);
    if (!nonEmpty(q?.explain)) errors.push(`${at} 缺少 explain`);
    const type = QUESTION_TYPES[q?.type];
    if (!type) errors.push(`${at} 未知題型 ${q?.type}`);
    else if (!type.validate(q)) errors.push(`${at} ${q.type} 欄位不合法`);
  });
  return errors;
}

// 從題庫隨機抽一輪（不重複）
export function pickRound(pack, rng = Math.random) {
  const pool = [...pack.questions];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, pack.roundSize);
}

export function isCorrect(question, response) {
  return QUESTION_TYPES[question.type].isCorrect(question, response);
}
