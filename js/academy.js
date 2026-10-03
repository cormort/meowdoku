// academy.js — 學院排課測驗（題庫來自 quizzes/，見 js/quiz.js）、能力象限與日常照護
import { audio } from "../audio.js";
import { activePetKey, addCoins, addPetStat, celebrateChapter, growthStage, petAffection, petData, petLevel, petName, petQuickStatusBarHtml, petStats, petStatus, petSubnavHtml, primaryTitle, recordStoryEvent, savePetData, setPetView, showPetHome, studyBuff, updatePetStatus } from "./pet.js";
import { showClinic, sickInfo, startCare } from "./life.js";
import { GRADES, PUBLISHERS, QUIZ_SUBJECTS, TERMS, TEXTBOOK_UNITS, calculateQuizResult, filterCount, gradeRewardMul, isCorrect, mistakeCounts, mistakesFor, mistakesToQuestions, pickRound, recordMistake, termInfo, unitsFor } from "./quiz.js";
import { ACTION_POSES, getRoomCatSprite } from "./room.js";
import { $, escapeHtml, showSheet } from "./ui.js";
// 姿勢圖鑑：坐姿 + 13 種動作立繪
const POSE_GALLERY = [{ key: "idle", icon: "🐱", label: "坐著發呆" }, ...ACTION_POSES];

// 目前選擇的冊次（年級＋學期）與教科書版本：存 localStorage
const LS_TERM = "meowdoku.quizTerm";
const LS_PUBLISHER = "meowdoku.quizPublisher";
const LS_GRADE_OLD = "meowdoku.quizGrade";
const DEFAULT_TERM = "5-1";
export function quizTerm() {
  const saved = localStorage.getItem(LS_TERM);
  if (TERMS.some((x) => x.key === saved)) return saved;
  // 舊版只存年級 → 帶到該年級上學期
  const oldGrade = Number(localStorage.getItem(LS_GRADE_OLD));
  const migrated = TERMS.find((x) => x.grade === oldGrade && x.term === 1);
  return migrated ? migrated.key : DEFAULT_TERM;
}
export function setQuizTerm(key) {
  if (!TERMS.some((x) => x.key === key)) return quizTerm();
  localStorage.setItem(LS_TERM, key);
  return key;
}
export function quizPublisher() {
  const saved = localStorage.getItem(LS_PUBLISHER);
  return PUBLISHERS.includes(saved) ? saved : ""; // "" = 全部版本
}
export function setQuizPublisher(publisher) {
  if (publisher && !PUBLISHERS.includes(publisher)) return quizPublisher();
  localStorage.setItem(LS_PUBLISHER, publisher || "");
  return quizPublisher();
}

// ===== 錯題本（答錯自動記錄，存在 localStorage） =====
const LS_MISTAKES = "meowdoku.mistakes";
export function loadMistakes() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_MISTAKES) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function saveMistakes(list) {
  try {
    localStorage.setItem(LS_MISTAKES, JSON.stringify(list));
  } catch {
    /* 存不進去就算了，不影響答題 */
  }
}
export function clearMistakeBook() {
  saveMistakes([]);
}
export function mistakeBookHtml() {
  const list = loadMistakes();
  const counts = mistakeCounts(list);
  const total = list.length;
  if (!total) {
    return `<details class="mistake-panel"><summary>📝 錯題本（目前是空的）</summary>
      <p class="unit-hint">答錯的題目會自動收進這裡，隨時可以按「練這科錯題」重新練習。</p></details>`;
  }
  const blocks = Object.values(QUIZ_SUBJECTS)
    .filter((s) => counts[s.id])
    .map((s) => {
      const items = mistakesFor(list, s.id)
        .slice(0, 3)
        .map((e) => {
          const q = (QUIZ_SUBJECTS[s.id].questions || []).find((x) => x.id === e.questionId);
          if (!q) return "";
          const prompt = q.prompt.length > 40 ? `${q.prompt.slice(0, 40)}…` : q.prompt;
          return `<li><span class="mistake-q">${escapeHtml(prompt)}</span><span class="mistake-a">正解：${escapeHtml(q.options[q.answer])}</span></li>`;
        })
        .join("");
      return `<div class="mistake-block">
        <div class="mistake-head">
          <b>${s.icon} ${s.name}</b>
          <span class="mistake-count">${counts[s.id]} 題</span>
          <button class="academy-action-btn mistake-drill" data-drill-subject="${s.id}">🔁 練這科錯題</button>
        </div>
        <ul class="mistake-list">${items}</ul>
      </div>`;
    })
    .join("");
  return `<details class="mistake-panel" open><summary>📝 錯題本（${total} 題待複習）</summary>
    ${blocks}
    <button class="academy-action-btn mistake-clear" data-mistake-clear="1">🗑 清空錯題本</button>
  </details>`;
}
// 用錯題本的題目開一輪複習（不耗體力，答對照樣有獎勵）
export function startMistakeSession(subjectId) {
  const sub = QUIZ_SUBJECTS[subjectId];
  if (!sub) return;
  const questions = mistakesToQuestions(loadMistakes(), sub, sub.roundSize);
  if (!questions.length) {
    showSheet("錯題本沒有這一科的題目 📝", "先去學院排課測驗，答錯的題目會自動收進錯題本。", "知道了");
    return;
  }
  currentQuizState = {
    subjectId,
    grade: questions[0].grade,
    term: questions[0].term || null,
    publisher: "",
    questions,
    currentIndex: 0,
    correctCount: 0,
    answered: false,
    review: true,
  };
  renderQuizQuestion();
}
export function academyPageHtml(key = activePetKey()) {
  const stats = petStats(key);
  const name = petName(key);
  const subList = Object.values(QUIZ_SUBJECTS);
  const term = quizTerm();
  const tInfo = termInfo(term);
  const pub = quizPublisher();
  const filter = { term, publisher: pub || null };

  const picker = `
    <div class="quiz-grade-picker">
      <span class="quiz-grade-title">📶 冊次</span>
      ${TERMS.map(
        ({ key: k, label, full }) =>
          `<button class="quiz-grade-btn${k === term ? " active" : ""}" data-quiz-term="${k}" title="${full}">${label}</button>`,
      ).join("")}
    </div>
    <div class="quiz-grade-picker">
      <span class="quiz-grade-title">📚 版本</span>
      <button class="quiz-grade-btn${pub === "" ? " active" : ""}" data-quiz-pub="" title="不限定版本，所有版本共通的內容都出">全部</button>
      ${PUBLISHERS.map(
        (p) => `<button class="quiz-grade-btn${pub === p ? " active" : ""}" data-quiz-pub="${p}" title="${p}版">${p}</button>`,
      ).join("")}
      <span class="quiz-grade-hint">${tInfo.full}${pub ? `・${pub}版` : "・不限版本"}</span>
    </div>
    <p class="unit-hint">📚 康軒／南一／翰林 適用全部科目；何嘉仁、佳音是英語版本（國小英語＝康軒・翰林・何嘉仁，國中英語＝康軒・南一・佳音）。</p>`;

  const unitBlocks = pub
    ? subList
        .map((sub) => {
          const units = unitsFor(sub.id, pub, term);
          if (!units.length) return "";
          return `<div class="unit-block"><b>${sub.icon} ${sub.name}</b><div class="unit-chips">${units
            .map(
              (u) =>
                `<span class="unit-chip">${u.unit_no ? `${u.unit_no}. ` : ""}${escapeHtml(u.unit_name)}</span>`,
            )
            .join("")}</div></div>`;
        })
        .join("")
    : "";
  const unitPanel = pub
    ? `<details class="unit-panel"><summary>📖 ${pub}版 ${tInfo.label} 對照單元${
        TEXTBOOK_UNITS.version ? `（${TEXTBOOK_UNITS.version}）` : ""
      }</summary>${unitBlocks || `<p class="unit-empty">這個版本／冊次目前還沒有可查證的單元對照資料（不憑印象填）。</p>`}</details>`
    : `<p class="unit-hint">選一個版本（康軒／南一／翰林），就會列出該版本在 ${tInfo.label} 的對照單元。</p>`;

  const cards = subList
    .map((sub) => {
      const val = stats[sub.id] || 0;
      const lvl = Math.floor(val / 10) + 1;
      const progressPercent = Math.min(100, Math.round(((val % 10) / 10) * 100));
      const pool = filterCount(sub, filter);
      const enough = pool >= sub.roundSize;
      return `
        <div class="academy-card">
          <div class="academy-card-head">
            <span class="academy-card-title">${sub.icon} ${sub.name}</span>
            <span class="academy-stat-val" style="background:${sub.bgLight}; color:${sub.color};">Lv.${lvl} (${val}pt)</span>
          </div>
          <div class="academy-desc">${sub.desc}</div>
          <div class="stat-meter-track" title="當前學科進度 ${val % 10}/10">
            <div class="stat-meter-fill" style="width:${progressPercent}%; background:${sub.color};"></div>
          </div>
          <button class="academy-action-btn" data-start-quiz="${sub.id}"${enough ? "" : " disabled"}>
            ${enough ? `${tInfo.label}${pub ? `・${pub}` : ""} 排課測驗（${pool} 題池・耗 15⚡）` : `${tInfo.label} 此範圍尚無題目`}
          </button>
        </div>
      `;
    })
    .join("");

  return `
    ${petSubnavHtml("academy")}
    ${petQuickStatusBarHtml(key)}
    <div class="academy-panel">
      <div class="academy-hero">
        <b>🎓 貓咪導師學院開課中！</b><br>
        替 <b>${escapeHtml(name)}</b> 排定五大學科隨堂測驗（每輪 ${subList[0]?.roundSize || 3} 題），選好你的冊次與版本，合格即可增加學科能力、賺取 <b>高額金幣 🪙</b> 與稀有掉落物！
      </div>
      ${picker}
      <div class="academy-grid">
        ${cards}
        <div class="academy-card academy-work-card">
          <div class="academy-card-head">
            <span class="academy-card-title">🧩 數獨打工兼職・邏輯特訓</span>
            <span class="academy-stat-val" style="background:#fef3c7; color:#b45309;">金幣 +60~200</span>
          </div>
          <div class="academy-desc">在數獨謎題中擔任貓咪小助手，每完成一局立即賺取大量金幣與算術邏輯屬性！</div>
          <button class="academy-action-btn" style="background:#d97706;" data-close-to-game="true">前往數獨打工 🐾</button>
        </div>
      </div>
      ${unitPanel}
      ${mistakeBookHtml()}
    </div>
  `;
}

export function statsPageHtml(key = activePetKey()) {
  const stats = petStats(key);
  const st = petStatus(key);
  const name = petName(key);
  const aff = petAffection(key);
  const lvl = petLevel(aff);
  const stage = growthStage(aff);

  const subList = Object.values(QUIZ_SUBJECTS);
  const statBars = subList
    .map((sub) => {
      const val = stats[sub.id] || 0;
      const percent = Math.min(100, Math.round((val / 100) * 100));
      return `
        <div class="stat-bar-box">
          <div class="stat-bar-head">
            <span>${sub.icon} ${sub.name}</span>
            <span style="color:${sub.color};">${val} pts</span>
          </div>
          <div class="stat-meter-track">
            <div class="stat-meter-fill" style="width:${percent}%; background:${sub.color};"></div>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    ${petSubnavHtml("stats")}
    ${petQuickStatusBarHtml(key)}
    <div class="stats-panel">
      <div class="pet-status-card" style="margin:0;">
        <div class="pet-status-head">
          <div class="pet-name-title">🐾 ${escapeHtml(name)}　Lv.${lvl}</div>
          <div class="growth-badges">
            <span class="growth-badge">${stage.icon} ${stage.name}</span>
            <span class="title-badge">🏅 ${primaryTitle(key)}・已裝備</span>
          </div>
        </div>
      </div>

      <div class="section-title" style="font-size:0.78rem; font-weight:800; color:var(--muted); margin-top:2px;">📊 學科能力六芒星分佈</div>
      <div class="stats-bars-grid">
        ${statBars}
      </div>

      <div class="section-title" style="font-size:0.78rem; font-weight:800; color:var(--muted); margin-top:4px;">🌱 電子雞生理作息健康指標</div>
      <div class="stats-bars-grid">
        <div class="stat-bar-box">
          <div class="stat-bar-head">
            <span>🍖 飽食度</span>
            <span>${st.hunger}/100</span>
          </div>
          <div class="stat-meter-track">
            <div class="stat-meter-fill" style="width:${st.hunger}%; background:#10b981;"></div>
          </div>
        </div>
        <div class="stat-bar-box">
          <div class="stat-bar-head">
            <span>⚡ 體力值</span>
            <span>${st.energy}/100</span>
          </div>
          <div class="stat-meter-track">
            <div class="stat-meter-fill" style="width:${st.energy}%; background:#3b82f6;"></div>
          </div>
        </div>
        <div class="stat-bar-box">
          <div class="stat-bar-head">
            <span>💤 疲勞度</span>
            <span>${st.fatigue}/100</span>
          </div>
          <div class="stat-meter-track">
            <div class="stat-meter-fill" style="width:${st.fatigue}%; background:#f59e0b;"></div>
          </div>
        </div>
        <div class="stat-bar-box">
          <div class="stat-bar-head">
            <span>🧹 清潔度</span>
            <span>${st.cleanliness}/100</span>
          </div>
          <div class="stat-meter-track">
            <div class="stat-meter-fill" style="width:${st.cleanliness}%; background:#06b6d4;"></div>
          </div>
        </div>
      </div>

      <div class="daily-care-row">
        <button class="daily-care-btn" data-care="feed">
          <span>🍖 飽餐一頓</span>
          <small>飽食+35 體力+10</small>
        </button>
        <button class="daily-care-btn" data-care="sleep">
          <span>💤 睡覺休息</span>
          <small>體力=100 疲勞-40</small>
        </button>
        <button class="daily-care-btn" data-care="bath">
          <span>🛁 梳理洗澡</span>
          <small>清潔=100 心情+15</small>
        </button>
      </div>

      <div class="section-title" style="font-size:0.78rem; font-weight:800; color:var(--muted); margin-top:6px;">🐾 全身姿勢圖鑑（點小圖可放大看）</div>
      <div class="pose-gallery">
        <div class="pose-stage">
          <img id="poseStageImg" src="${getRoomCatSprite(key, "idle")}" alt="${escapeHtml(name)} 的全身立繪" onerror="this.onerror=null; this.src=this.src.replace('.webp', '.png');">
          <span class="pose-stage-tag" id="poseStageTag">🐱 坐著發呆</span>
        </div>
        <div class="pose-grid">
          ${POSE_GALLERY.map(
            (p) => `<button class="pose-card${p.key === "idle" ? " active" : ""}" data-pose-preview="${p.key}" data-pose-label="${p.icon} ${p.label}">
              <img src="${getRoomCatSprite(key, p.key)}" alt="${p.label}" loading="lazy" onerror="this.onerror=null; this.src=this.src.replace('.webp', '.png');">
              <small>${p.icon} ${p.label}</small>
            </button>`,
          ).join("")}
        </div>
      </div>
    </div>
  `;
}

let currentQuizState = null;

export function startQuizSession(subjectId) {
  if (!QUIZ_SUBJECTS[subjectId]) return;
  const sub = QUIZ_SUBJECTS[subjectId];
  const key = activePetKey();
  const st = petStatus(key);
  const term = quizTerm();
  const tInfo = termInfo(term);
  const publisher = quizPublisher();
  const questions = pickRound(sub, { term, publisher: publisher || null });
  if (sickInfo(key)) {
    showSheet("貓咪生病了 🤒", `${sickInfo(key).icon} ${sickInfo(key).name}中，先帶去看醫生再來上課吧！`, "去看醫生", showClinic, "取消");
    return;
  }
  if (!questions.length) {
    showSheet(
      "這個範圍還沒有題目 📶",
      `「${sub.name}」目前還沒有 ${tInfo.full}${publisher ? `・${publisher}版` : ""} 的題目，請換冊次或版本試試。`,
      "知道了",
    );
    return;
  }
  const needEnergy = Math.round(15 * Math.max(0.8, gradeRewardMul(tInfo.grade)));
  if (st.energy < needEnergy) {
    showSheet("貓咪體力不足 ⚡", `貓咪太累了喵！請先前往「屬性」面板讓貓咪「睡覺休息」恢復體力後再來上課！`, "前往休息", () => setPetView("stats"));
    return;
  }
  if (st.hunger < 10) {
    showSheet("肚子咕嚕嚕 🍖", "貓咪太餓了喵！請先前往餵食飽餐一頓，補足元氣再來學習！", "前往餵食", () => setPetView("stats"));
    return;
  }

  currentQuizState = {
    subjectId,
    grade: tInfo.grade,
    term,
    publisher,
    questions,
    currentIndex: 0,
    correctCount: 0,
    answered: false,
  };

  renderQuizQuestion();
}

function renderQuizQuestion() {
  if (!currentQuizState) return;
  const { subjectId, questions, currentIndex } = currentQuizState;
  if (currentIndex >= questions.length) {
    finishQuizSession();
    return;
  }

  const sub = QUIZ_SUBJECTS[subjectId];
  const q = questions[currentIndex];
  currentQuizState.answered = false;

  const optionsHtml = q.options
    .map(
      (opt, i) => `
    <button class="quiz-option-btn" data-quiz-opt="${i}">
      <span style="opacity:0.6;">${["A", "B", "C", "D"][i]}.</span>
      <span>${escapeHtml(opt)}</span>
    </button>
  `,
    )
    .join("");

  const body = `
    <div class="quiz-box">
      <div class="quiz-header">
        <span style="font-weight:800; color:${sub.color};">${sub.icon} ${sub.name}</span>
        <span class="quiz-grade-tag">${currentQuizState.review ? "📝 錯題複習" : `📶 ${termInfo(currentQuizState.term)?.label || ""}`}</span>
        ${!currentQuizState.review && currentQuizState.publisher ? `<span class="quiz-grade-tag">📚 ${currentQuizState.publisher}</span>` : ""}
        <span class="quiz-counter">第 ${currentIndex + 1} / ${questions.length} 題</span>
      </div>
      <div class="quiz-question">${escapeHtml(q.prompt)}</div>
      <div class="quiz-options" id="quizOptionsWrap">
        ${optionsHtml}
      </div>
      <div id="quizFeedbackBox"></div>
    </div>
  `;

  showSheet(`📚 隨堂測驗・${sub.name}`, body, "退出測驗", () => setPetView("academy"));
}

export function handleQuizAnswer(selectedIndex) {
  if (!currentQuizState || currentQuizState.answered) return;
  currentQuizState.answered = true;

  const { questions, currentIndex } = currentQuizState;
  const q = questions[currentIndex];
  const correct = isCorrect(q, Number(selectedIndex));

  if (correct) {
    currentQuizState.correctCount++;
    audio.playQuizCorrect?.();
    audio.playCoin?.();
  } else {
    audio.playError?.();
    // 答錯就收進錯題本（同一題只留最新一次）
    saveMistakes(
      recordMistake(loadMistakes(), {
        subjectId: currentQuizState.subjectId,
        questionId: q.id,
        term: currentQuizState.term || "",
        publisher: currentQuizState.publisher || "",
        chosen: Number(selectedIndex),
        at: Date.now(),
      }),
    );
  }
  navigator.vibrate?.(correct ? [20, 20] : 40);

  const buttons = document.querySelectorAll("#quizOptionsWrap .quiz-option-btn");
  buttons.forEach((btn, idx) => {
    btn.disabled = true;
    if (isCorrect(q, idx)) btn.classList.add("correct");
    else if (idx === Number(selectedIndex)) btn.classList.add("wrong");
  });

  const feedbackBox = $("quizFeedbackBox");
  if (feedbackBox) {
    feedbackBox.innerHTML = `
      <div class="quiz-feedback" style="border-left: 4px solid ${correct ? "#10b981" : "#ef4444"};">
        <b>${correct ? "🎉 答對了！太厲害了喵！" : "😿 答錯囉！下次加油！"}</b>
        <div>💡 <b>解析：</b>${escapeHtml(q.explain)}</div>
        ${q.tip ? `<div style="margin-top:4px; color:var(--muted);"><small>🐾 提示：${escapeHtml(q.tip)}</small></div>` : ""}
      </div>
      <button class="academy-action-btn" id="btnNextQuizQuestion" style="margin-top:10px; width:100%; font-size:0.85rem; padding:10px;">
        ${currentIndex + 1 < questions.length ? "下一題 ➔" : "查看成績單 🏆"}
      </button>
    `;
    $("btnNextQuizQuestion")?.addEventListener("click", () => {
      currentQuizState.currentIndex++;
      renderQuizQuestion();
    });
  }
}

function finishQuizSession() {
  if (!currentQuizState) return;
  const { subjectId, correctCount, questions } = currentQuizState;
  const total = questions.length;
  const quizGradeUsed = currentQuizState.grade;
  const quizTermUsed = currentQuizState.term;
  const quizPublisherUsed = currentQuizState.publisher;
  const res = calculateQuizResult(subjectId, correctCount, total, quizGradeUsed);
  const sub = QUIZ_SUBJECTS[subjectId];
  const key = activePetKey();

  // 陪讀加成（📖 一起讀書）：30 分鐘內完成測驗，金幣 +20%
  const buff = studyBuff();
  const coinsGained = buff > 1 ? Math.round(res.coins * buff) : res.coins;
  res.coins = coinsGained;

  addCoins(res.coins);
  addPetStat(key, subjectId, res.statGain);
  updatePetStatus(key, {
    energy: -res.staminaCost,
    hunger: -res.hungerCost,
    fatigue: res.fatigueGain,
  });

  // 主線任務：答對題數（錯題複習則記在「錯題重練答對」）
  try {
    const { completed } = recordStoryEvent(currentQuizState.review ? "mistake_fix" : "quiz_correct", res.correctCount);
    if (completed) setTimeout(() => celebrateChapter(completed), 350);
  } catch {
    /* 劇情系統不影響測驗 */
  }

  const drop = res.dropItem;
  if (drop?.type === "ticket_scrap") petData.ticketScraps = (petData.ticketScraps || 0) + drop.qty;
  else if (drop) {
    const itemKey = drop.type === "premium_snack" ? "premium" : "fish";
    petData.food[itemKey] = (petData.food[itemKey] || 0) + drop.qty;
  }

  savePetData();
  audio.playVictory?.();

  const grade = res.perfect ? "S" : res.pass ? "A" : "B";

  const body = `
    <div class="quiz-result-card">
      <div class="quiz-grade-badge">${grade}</div>
      <div style="font-size:1.1rem; font-weight:800; color:var(--ink);">
        ${res.perfect ? "全對滿分！天資聰穎喵！🎉" : res.pass ? "測驗合格！進步神速喵！✨" : "完成測驗！繼續加油喵！🐾"}
      </div>
      <div style="font-size:0.82rem; color:var(--muted);">
        答對 ${res.correctCount} / ${res.totalCount} 題 · 得分 ${res.score} 分
      </div>
      <div style="font-size:0.78rem; color:var(--muted);">
        ${quizTermUsed ? `📶 ${termInfo(quizTermUsed)?.full || ""}` : "📝 錯題複習"}${quizPublisherUsed ? `・${quizPublisherUsed}版` : quizTermUsed ? "・不限版本" : ""}${
          res.rewardMul !== 1 ? `（獎勵 ×${res.rewardMul}）` : ""
        }
      </div>
      <div class="quiz-rewards-row">
        <span class="quiz-reward-pill">🪙 +${res.coins} 金幣</span>
        <span class="quiz-reward-pill" style="color:${sub.color};">${sub.icon} ${sub.statName} +${res.statGain}</span>
        ${res.dropItem ? `<span class="quiz-reward-pill" style="color:#b45309;">${res.dropItem.name} ×${res.dropItem.qty}</span>` : ""}
      </div>
      <div style="font-size:0.72rem; color:var(--muted); line-height:1.4;">
        體力 -${res.staminaCost}⚡ · 飽食 -${res.hungerCost}🍖 · 疲勞 +${res.fatigueGain}💤
      </div>
    </div>
  `;

  currentQuizState = null;
  showSheet("🏆 測驗成績單結算", body, "返回學院", () => setPetView("academy"));
}

export function handleDailyCare(type) {
  const key = activePetKey();
  if (type === "feed") {
    updatePetStatus(key, { hunger: 35, energy: 10 });
    audio.playCatPlace?.();
    // 主線任務：照顧貓咪的次數
    try {
      const { completed } = recordStoryEvent("care", 1);
      if (completed) celebrateChapter(completed);
    } catch {
      /* 劇情系統不影響餵食 */
    }
    showPetHome();
  } else if (type === "sleep") {
    const s = petStatus(key);
    s.energy = 100;
    s.fatigue = Math.max(0, s.fatigue - 40);
    savePetData();
    audio.playPurr?.();
    showPetHome();
  } else if (type === "bath") {
    // 洗澡改到客廳親手洗
    setPetView("home");
    startCare("bath");
  }
}

