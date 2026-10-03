// tests/quiz.test.mjs — 驗證 quizzes/ 下所有學科題庫符合標準格式
// 用法：node tests/quiz.test.mjs
import { readFileSync } from "node:fs";
import {
  GRADES,
  MISTAKE_LIMIT,
  PUBLISHERS,
  SUBJECT_PUBLISHERS,
  filterCount,
  TERMS,
  calculateQuizResult,
  gradeCounts,
  isCorrect,
  matchesFilter,
  mistakeCounts,
  mistakesFor,
  mistakesToQuestions,
  pickRound,
  publisherCounts,
  recordMistake,
  termCounts,
  validateSubject,
} from "../js/quiz.js";

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

console.log("=== 程度（年級）分佈 ===");
const gradeNums = GRADES.map((g) => g.grade);
for (const file of read("index.json").subjects) {
  const subject = read(file);
  const counts = gradeCounts(subject);
  check(
    gradeNums.every((g) => counts[g] >= subject.roundSize),
    `${file} 每個程度都有 ≥${subject.roundSize} 題（${gradeNums.map((g) => `${g}:${counts[g]}`).join(" ")}）`,
  );
  const g = gradeNums[1];
  const round = pickRound(subject, g);
  check(
    round.length === subject.roundSize && round.every((q) => q.grade === g) && new Set(round).size === round.length,
    `${file} 抽題只抽指定程度且不重複（${g}）`,
  );
  check(
    calculateQuizResult(subject.id, 3, 3, gradeNums[gradeNums.length - 1]).statGain >
      calculateQuizResult(subject.id, 3, 3, gradeNums[0]).statGain,
    `${file} 程度越高獎勵越多`,
  );
}

console.log("=== 冊次與版本 ===");
for (const file of read("index.json").subjects) {
  const subject = read(file);
  const pubs = SUBJECT_PUBLISHERS[subject.id] || PUBLISHERS;
  // 不限冊次、不限版本時，每個科目都要出得了題（沒選範圍時的保底）
  check(
    filterCount(subject, {}) >= subject.roundSize,
    `${file} 不限範圍時可出題（${filterCount(subject, {})} 題 ≥ roundSize ${subject.roundSize}）`,
  );
  let full = 0;
  const gaps = [];
  for (const { key } of TERMS) {
    for (const p of pubs) {
      const n = filterCount(subject, { term: key, publisher: p });
      if (n >= subject.roundSize) {
        full++;
        const round = pickRound(subject, { term: key, publisher: p });
        check(
          round.length === subject.roundSize &&
            round.every((q) => matchesFilter(q, { term: key, publisher: p })),
          `${file} ${key}・${p} 抽題只抽該範圍且不重複`,
        );
      } else {
        gaps.push(`${key}・${p}(${n})`);
      }
    }
  }
  check(full >= 1, `${file} 至少有一個（冊次,版本）組合能直接排課測驗`);
  console.log(`     ↳ 可直接排課的組合 ${full} 個／${TERMS.length * pubs.length}；題目不足的：${gaps.slice(0, 8).join(" ")}${gaps.length > 8 ? " …" : ""}`);
  // 版本過濾：標了 versions 的題目要被其他版本排除（terms 的題目由上面的組合測試涵蓋）
  const sample = { ...subject, questions: [{ ...subject.questions[0], versions: ["康軒"] }] };
  delete sample.questions[0].terms;
  delete sample.questions[0].term;
  check(
    matchesFilter(sample.questions[0], { publisher: "康軒" }) &&
      !matchesFilter(sample.questions[0], { publisher: "翰林" }),
    `${file} versions 標記會排除其他版本`,
  );
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
check(bad({ grade: 99 }), "grade 超出範圍");
check(bad({ grade: undefined }), "缺少 grade（程度）");
check(validateSubject({ ...good, roundSize: 999 }).length > 0, "roundSize 大於題數");
check(validateSubject({ ...good, color: "red" }).length > 0, "顏色格式錯誤");

console.log("=== 結算 ===");
check(calculateQuizResult("math", 3, 3).perfect && calculateQuizResult("math", 2, 3).pass, "3 題答對 2 題算合格");
check(!calculateQuizResult("math", 1, 3).pass, "3 題答對 1 題不合格");

console.log("=== 錯題本 ===");
{
  const mk = (id, sub = "math", at = 1) => ({ subjectId: sub, questionId: id, at });
  let book = [];
  book = recordMistake(book, mk("math-001", "math", 1));
  book = recordMistake(book, mk("math-002", "math", 2));
  check(book.length === 2 && book[0].questionId === "math-002", "錯題依新到舊排序");
  book = recordMistake(book, mk("math-001", "math", 3));
  check(book.length === 2 && book[0].questionId === "math-001" && book[0].at === 3, "同一題再錯只留最新一次");
  book = recordMistake(book, mk("chinese-001", "chinese", 4));
  const counts = mistakeCounts(book);
  check(counts.math === 2 && counts.chinese === 1, "各科錯題數統計正確");
  check(mistakesFor(book, "math").length === 2, "可依科目篩選錯題");
  // 上限
  let big = [];
  for (let i = 0; i < MISTAKE_LIMIT + 20; i++) big = recordMistake(big, mk(`math-x${i}`));
  check(big.length === MISTAKE_LIMIT, `錯題本上限 ${MISTAKE_LIMIT} 筆`);
  check(recordMistake(book, {}).length === 3, "壞資料不會寫進錯題本");
  // 重練：過濾已刪除的題目、去重、依 roundSize 取前幾題
  const subject = read("math.json");
  const again = mistakesToQuestions([mk("math-001"), mk("不存在"), mk("math-001"), mk("math-002")], subject, 2);
  check(again.length === 2 && again[0].id === "math-001" && again[1].id === "math-002", "錯題重練只取存在的題目且不重複");
}

console.log(failures ? `\n${failures} 項失敗` : "\n全部通過");
process.exit(failures ? 1 : 0);
