// academy.js — 學院排課測驗（題庫來自 quizzes/，見 js/quiz.js）、能力象限與日常照護
import { audio } from "../audio.js";
import { activePetKey, addCoins, addPetStat, growthStage, petAffection, petData, petLevel, petName, petQuickStatusBarHtml, petStats, petStatus, petSubnavHtml, primaryTitle, savePetData, setPetView, showPetHome, updatePetStatus } from "./pet.js";
import { showClinic, sickInfo } from "./life.js";
import { QUIZ_SUBJECTS, calculateQuizResult, isCorrect, pickRound } from "./quiz.js";
import { $, escapeHtml, showSheet } from "./ui.js";
export function academyPageHtml(key = activePetKey()) {
  const stats = petStats(key);
  const name = petName(key);
  const subList = Object.values(QUIZ_SUBJECTS);

  const cards = subList
    .map((sub) => {
      const val = stats[sub.id] || 0;
      const lvl = Math.floor(val / 10) + 1;
      const progressPercent = Math.min(100, Math.round(((val % 10) / 10) * 100));
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
          <button class="academy-action-btn" data-start-quiz="${sub.id}">排課測驗 (耗 15⚡)</button>
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
        替 <b>${escapeHtml(name)}</b> 排定六大學科隨堂測驗（3 題趣味通識），合格即可增加學科能力、賺取 <b>高額金幣 🪙</b> 與稀有掉落物！
      </div>
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
    </div>
  `;
}

let currentQuizState = null;

export function startQuizSession(subjectId) {
  if (!QUIZ_SUBJECTS[subjectId]) return;
  const key = activePetKey();
  const st = petStatus(key);
  if (sickInfo(key)) {
    showSheet("貓咪生病了 🤒", `${sickInfo(key).icon} ${sickInfo(key).name}中，先帶去看醫生再來上課吧！`, "去看醫生", showClinic, "取消");
    return;
  }
  if (st.energy < 15) {
    showSheet("貓咪體力不足 ⚡", "貓咪太累了喵！請先前往「屬性」面板讓貓咪「睡覺休息」恢復體力後再來上課！", "前往休息", () => setPetView("stats"));
    return;
  }
  if (st.hunger < 10) {
    showSheet("肚子咕嚕嚕 🍖", "貓咪太餓了喵！請先前往餵食飽餐一頓，補足元氣再來學習！", "前往餵食", () => setPetView("stats"));
    return;
  }

  currentQuizState = {
    subjectId,
    questions: pickRound(QUIZ_SUBJECTS[subjectId]),
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
  const res = calculateQuizResult(subjectId, correctCount, total);
  const sub = QUIZ_SUBJECTS[subjectId];
  const key = activePetKey();

  addCoins(res.coins);
  addPetStat(key, subjectId, res.statGain);
  updatePetStatus(key, {
    energy: -res.staminaCost,
    hunger: -res.hungerCost,
    fatigue: res.fatigueGain,
  });

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
    showPetHome();
  } else if (type === "sleep") {
    const s = petStatus(key);
    s.energy = 100;
    s.fatigue = Math.max(0, s.fatigue - 40);
    savePetData();
    audio.playPurr?.();
    showPetHome();
  } else if (type === "bath") {
    const s = petStatus(key);
    s.cleanliness = 100;
    savePetData();
    audio.playCatPet?.();
    showPetHome();
  }
}

