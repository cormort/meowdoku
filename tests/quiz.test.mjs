// tests/quiz.test.mjs — 驗證 quizzes/ 下所有題庫符合標準格式
// 用法：node tests/quiz.test.mjs
import { readFileSync } from "node:fs";
import { validatePack, pickRound, isCorrect } from "../js/quiz-format.js";

const dir = new URL("../quizzes/", import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, dir), "utf8"));
let failures = 0;
const check = (cond, label) => {
  if (!cond) failures++;
  console.log(`  ${cond ? "✅" : "❌"} ${label}`);
};

console.log("=== 題庫格式 ===");
const ids = new Set();
for (const file of read("index.json").packs) {
  const pack = read(file),
    errors = validatePack(pack);
  check(!errors.length, `${file}（${pack.questions?.length ?? 0} 題）${errors.length ? "：" + errors.join("；") : ""}`);
  check(!ids.has(pack.id), `${file} id 不與其他題庫重複`);
  ids.add(pack.id);
  const round = pickRound(pack);
  check(round.length === pack.roundSize && new Set(round).size === round.length, `${file} 抽題數正確且不重複`);
  check(round.every((q) => isCorrect(q, q.answer)), `${file} 正解判定正確`);
}

console.log("=== 驗證器會擋下錯誤題目 ===");
const good = read("cat-trivia.json");
const bad = (patch) => validatePack({ ...good, questions: [{ ...good.questions[0], ...patch }, ...good.questions.slice(1)] }).length > 0;
check(bad({ answer: 9 }), "answer 超出範圍");
check(bad({ type: "nope" }), "未知題型");
check(bad({ options: ["只有一個"] }), "選項少於 2 個");
check(bad({ id: good.questions[1].id }), "題目 id 重複");
check(bad({ explain: "" }), "缺少解說");
check(validatePack({ ...good, passScore: 99 }).length > 0, "passScore 大於 roundSize");

console.log(failures ? `\n${failures} 項失敗` : "\n全部通過");
process.exit(failures ? 1 : 0);
