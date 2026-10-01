// tests/quiz.test.mjs — 驗證 quizzes/ 下所有學科題庫符合標準格式
// 用法：node tests/quiz.test.mjs
import { readFileSync } from "node:fs";
import { validateSubject, pickRound, isCorrect, calculateQuizResult } from "../js/quiz.js";

const dir = new URL("../quizzes/", import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, dir), "utf8"));
let failures = 0;
const check = (cond, label) => {
  if (!cond) failures++;
  console.log(`  ${cond ? "✅" : "❌"} ${label}`);
};

console.log("=== 題庫格式 ===");
const ids = new Set();
for (const file of read("index.json").subjects) {
  const subject = read(file),
    errors = validateSubject(subject);
  check(!errors.length, `${file}（${subject.questions?.length ?? 0} 題）${errors.length ? "：" + errors.join("；") : ""}`);
  check(file === `${subject.id}.json` && !ids.has(subject.id), `${file} 檔名＝id 且不重複`);
  ids.add(subject.id);
  const round = pickRound(subject);
  check(round.length === subject.roundSize && new Set(round).size === round.length, `${file} 抽題數正確且不重複`);
  check(round.every((q) => isCorrect(q, q.answer)), `${file} 正解判定正確`);
}

console.log("=== 驗證器會擋下錯誤題目 ===");
const good = read("science.json");
const bad = (patch) =>
  validateSubject({ ...good, questions: [{ ...good.questions[0], ...patch }, ...good.questions.slice(1)] }).length > 0;
check(!validateSubject(good).length, "合法題庫通過");
check(bad({ answer: 9 }), "answer 超出範圍");
check(bad({ type: "nope" }), "未知題型");
check(bad({ options: ["只有一個"] }), "選項少於 2 個");
check(bad({ options: ["a", "b", "c", "d", "e"] }), "選項超過 4 個");
check(bad({ id: good.questions[1].id }), "題目 id 重複");
check(bad({ explain: "" }), "缺少解說");
check(bad({ tip: "" }), "tip 空白");
check(validateSubject({ ...good, roundSize: 999 }).length > 0, "roundSize 大於題數");
check(validateSubject({ ...good, color: "red" }).length > 0, "顏色格式錯誤");

console.log("=== 結算 ===");
check(calculateQuizResult("math", 3, 3).perfect && calculateQuizResult("math", 2, 3).pass, "3 題答對 2 題算合格");
check(!calculateQuizResult("math", 1, 3).pass, "3 題答對 1 題不合格");

console.log(failures ? `\n${failures} 項失敗` : "\n全部通過");
process.exit(failures ? 1 : 0);
