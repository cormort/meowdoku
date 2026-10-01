// quiz.js — 問答小遊戲畫面：讀題庫、出題、作答回饋、過關獎勵
import { audio } from "../audio.js";
import { addAffection } from "../cathouse.js";
import { $, LS, escapeHtml, showSheet } from "./ui.js";
import { validatePack, pickRound, isCorrect } from "./quiz-format.js";
import { awardWin, rewardHtml, addEventProgress } from "./pet.js";

// 讀 quizzes/index.json 列出的所有題庫；格式不合法的題庫略過並在主控台報錯
export async function loadPacks() {
  const index = await fetch("./quizzes/index.json").then((r) => r.json());
  const packs = await Promise.all(
    index.packs.map((file) =>
      fetch(`./quizzes/${file}`)
        .then((r) => r.json())
        .catch(() => null),
    ),
  );
  return packs.filter((pack, i) => {
    const errors = validatePack(pack);
    if (errors.length) console.error(`題庫 ${index.packs[i]} 格式錯誤`, errors);
    return !errors.length;
  });
}

// 題型畫面：回傳作答按鈕 HTML，按鈕的 data-response 是 JSON 編碼的作答值
const RENDERERS = {
  choice: (q) =>
    q.options
      .map((o, i) => `<button data-response="${i}">${escapeHtml(o)}</button>`)
      .join(""),
};

let round = null;

export function startQuiz(pack) {
  round = { pack, questions: pickRound(pack), index: 0, score: 0, answered: false };
  renderQuestion();
}

function renderQuestion() {
  const { pack, questions, index, score } = round,
    q = questions[index];
  round.answered = false;
  $("quizView").innerHTML =
    `<h2>${pack.icon} ${escapeHtml(pack.title)}</h2>` +
    `<div class="quiz-head"><span>第 ${index + 1}／${questions.length} 題</span><span>答對 ${score}</span></div>` +
    `<p class="quiz-prompt">${escapeHtml(q.prompt)}</p>` +
    `<div class="quiz-options">${RENDERERS[q.type](q)}</div>`;
}

function answer(button) {
  if (round.answered) return;
  round.answered = true;
  const q = round.questions[round.index],
    response = JSON.parse(button.dataset.response),
    ok = isCorrect(q, response);
  if (ok) round.score++;
  ok ? audio.playCatPlace() : audio.playError();
  const buttons = $("quizView").querySelectorAll("[data-response]");
  buttons.forEach((b) => {
    b.disabled = true;
    if (isCorrect(q, JSON.parse(b.dataset.response))) b.classList.add("correct");
  });
  if (!ok) button.classList.add("wrong");
  const last = round.index === round.questions.length - 1;
  $("quizView").insertAdjacentHTML(
    "beforeend",
    `<p class="quiz-explain">${ok ? "✅ 答對了！" : "❌ 答錯了。"}${escapeHtml(q.explain)}</p><button class="primary quiz-next" data-next>${last ? "看結果" : "下一題"}</button>`,
  );
  $("quizView").querySelector(".quiz-head span:last-child").textContent = `答對 ${round.score}`;
}

function finish() {
  const { pack, questions, score } = round,
    total = questions.length,
    passed = score >= pack.passScore,
    bestKey = LS.quizBest(pack.id),
    best = Number(localStorage.getItem(bestKey) || 0);
  if (score > best) localStorage.setItem(bestKey, String(score));
  let body = `答對 <b>${score}／${total}</b> 題（最佳 ${Math.max(score, best)}）`;
  if (passed) {
    audio.playVictory();
    addAffection(score);
    addEventProgress("wins", 1);
    body += rewardHtml(
      awardWin({
        record: "quiz",
        rolls: score === total ? 2 : 1,
        pool: ["fish", "fish", "chicken"],
        affection: score,
      }),
    );
  } else body += `<br>答對 ${pack.passScore} 題就能拿到獎勵，再試一次吧！`;
  showSheet(passed ? "過關！🎉" : "差一點！", body, "再玩一次", () => startQuiz(pack), "回貓屋", () => (location.hash = ""));
}

$("quizView").addEventListener("click", (e) => {
  if (!round) return;
  const choice = e.target.closest("[data-response]");
  if (choice) return answer(choice);
  if (!e.target.closest("[data-next]")) return;
  if (round.index === round.questions.length - 1) return finish();
  round.index++;
  renderQuestion();
});
