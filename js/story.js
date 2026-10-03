// story.js — 主線劇情、任務進度與貓咪提醒
// 設定：貓咪是「星讀學園」派來的見習學習貓，來陪你讀書、提醒你複習。
// 這裡只有純資料與純函式，方便測試；UI 由 pet.js / academy.js 呈現。

export const STORY = {
  id: "starlight",
  title: "星讀學園的委託",
  intro:
    "夜空裡有一間「星讀學園」，專門訓練學習貓去幫助世界各地的小朋友。今天，一隻見習學習貓來到了你家——牠的任務，就是陪你一起把不會的東西變會。",
  chapters: [
    {
      id: "ch1",
      title: "第一章・貓咪從天而降",
      lines: [
        "喵——！終於找到你了！我是星讀學園派來的見習學習貓。",
        "我的任務很簡單：陪你學習、提醒你複習，還有……偶爾討摸。",
        "先讓我看看你的實力吧！去學院排一次隨堂測驗，答對 3 題就好。",
      ],
      task: { type: "quiz_correct", target: 3, label: "隨堂測驗答對 3 題" },
      reward: { coins: 150, affection: 10 },
    },
    {
      id: "ch2",
      title: "第二章・錯題不是敵人",
      lines: [
        "答錯的題目我都有偷偷記下來喵（就在錯題本裡）。",
        "錯題就像還沒拆開的禮物——把它弄懂，就變成你的了。",
        "去錯題本按「練這科錯題」，把 2 題重新答對給我看！",
      ],
      task: { type: "mistake_fix", target: 2, label: "錯題重練答對 2 題" },
      reward: { coins: 200, affection: 12 },
    },
    {
      id: "ch3",
      title: "第三章・照顧夥伴",
      lines: [
        "讀書很重要，但吃飯、洗澡、梳毛也很重要喵。",
        "把我照顧好，我的腦袋才會轉得快，陪讀也更有效。",
        "幫我梳毛、洗澡，再餵我吃一頓好嗎？",
      ],
      task: { type: "care", target: 3, label: "照顧貓咪 3 次（梳毛／洗澡／餵食）" },
      reward: { coins: 220, affection: 14 },
    },
    {
      id: "ch4",
      title: "第四章・出門看看世界",
      lines: [
        "課本裡的東西，其實外面都看得到喵。",
        "去公園散步、去海邊吹風、去看一場電影——回來你會更想讀書。",
        "帶我出門一次吧！",
      ],
      task: { type: "trip", target: 1, label: "帶貓咪出門 1 次" },
      reward: { coins: 250, affection: 16 },
    },
    {
      id: "ch5",
      title: "第五章・學科小達人",
      lines: [
        "學習就像爬樹，一階一階來，累了就休息喵。",
        "只要有一科能力值到 30 點，你就已經比昨天的自己厲害很多了。",
        "選一科你最想變強的，我們一起練！",
      ],
      task: { type: "subject_stat", target: 30, label: "任一科能力值達到 30" },
      reward: { coins: 300, affection: 18 },
    },
    {
      id: "ch6",
      title: "第六章・星讀學園的考驗",
      lines: [
        "最後一關喵：學園要看看你是不是真的會自己學習了。",
        "答對 12 題，不限科目、不限冊次——這是你的畢業考。",
        "完成之後，我就會正式成為你的專屬學習夥伴！",
      ],
      task: { type: "quiz_correct", target: 12, label: "答對 12 題" },
      reward: { coins: 600, affection: 30, title: "星讀學園學習夥伴" },
    },
  ],
};

export function newStoryState() {
  return { chapterIndex: 0, progress: {}, done: [] };
}
export function normalizeStory(story) {
  const base = newStoryState();
  if (!story || typeof story !== "object") return base;
  return {
    chapterIndex: Number.isInteger(story.chapterIndex) ? story.chapterIndex : 0,
    progress: story.progress && typeof story.progress === "object" ? { ...story.progress } : {},
    done: Array.isArray(story.done) ? [...story.done] : [],
  };
}
export function currentChapter(story) {
  const s = normalizeStory(story);
  return STORY.chapters[s.chapterIndex] || null;
}
export function storyFinished(story) {
  return normalizeStory(story).chapterIndex >= STORY.chapters.length;
}
// 目前任務的進度（給 UI 畫進度條）
export function taskProgress(story) {
  const s = normalizeStory(story);
  const ch = currentChapter(s);
  if (!ch) return null;
  const have = Math.min(s.progress[ch.task.type] || 0, ch.task.target);
  return {
    type: ch.task.type,
    label: ch.task.label,
    have,
    need: ch.task.target,
    percent: Math.round((have / ch.task.target) * 100),
    complete: have >= ch.task.target,
  };
}
// 記錄事件；若達成目標就自動進到下一章。回傳 { story, completed }
export function applyEvent(story, type, n = 1) {
  const s = normalizeStory(story);
  const ch = currentChapter(s);
  if (!ch || !type) return { story: s, completed: null };
  const progress = { ...s.progress, [type]: (s.progress[type] || 0) + n };
  if (progress[type] < ch.task.target) return { story: { ...s, progress }, completed: null };
  return {
    story: { ...s, chapterIndex: s.chapterIndex + 1, progress: {}, done: [...s.done, ch.id] },
    completed: ch,
  };
}

// ===== 貓咪說的話 =====
function pad(n) {
  return String(n).padStart(2, "0");
}
export function timeGreeting(date = new Date()) {
  const h = date.getHours();
  if (h < 6) return "這麼晚還沒睡喵？要注意作息喔。";
  if (h < 11) return "早安喵！今天想先練哪一科？";
  if (h < 17) return "午安喵～休息一下再繼續，效率更好。";
  if (h < 22) return "晚安喵，今天學到的東西複習一下就不會忘囉。";
  return "夜深了喵，早點休息，明天我再陪你。";
}
// 依貓咪狀態與任務進度挑一句最需要的提醒
export function reminderLine({
  name = "貓咪",
  hunger = 100,
  energy = 100,
  mood = 80,
  mistakes = 0,
  story = null,
  streak = 0,
} = {}) {
  const ch = currentChapter(story);
  const p = taskProgress(story);
  if (hunger < 30) return `${name}肚子餓了喵…先餵我吃點東西好不好？`;
  if (energy < 25) return `${name}有點累了喵，讓我睡一下再陪你讀書好嗎？`;
  if (mood < 30) return `${name}今天心情不太好喵，陪我玩一下好不好？`;
  if (mistakes >= 3) return `錯題本裡還有 ${mistakes} 題等你喵，我們一起把它們變會吧！`;
  if (p && !p.complete) return `今天的任務是「${p.label}」——目前 ${p.have}/${p.need}，加油喵！`;
  if (mistakes > 0) return `還有 ${mistakes} 題錯題待複習喵，練完我給你一個抱抱！`;
  if (ch) return `${ch.title}開始了喵！按下面的按鈕看看我要說什麼。`;
  if (streak >= 3) return `連續 ${streak} 天都來看我，你真的很棒喵！`;
  return `今天也想跟你一起學習喵！（先去學院排一次隨堂測驗吧）`;
}
// 「說說話」：依狀態給不同回應
export function talkLines({ mood = 80, affection = 0, hour = 12 } = {}) {
  const lines = [];
  if (affection >= 200) lines.push("跟你在一起的時候，我覺得自己是最幸運的學習貓喵。");
  else if (affection >= 80) lines.push("我們已經是很好的夥伴了喵！");
  else lines.push("嗨嗨，今天想聊什麼喵？");
  if (mood >= 70) lines.push("我今天精神很好，可以陪你讀很多題！");
  else if (mood >= 40) lines.push("還可以喵，陪我玩一下會更有精神。");
  else lines.push("有點提不起勁喵…摸摸我好不好？");
  if (hour >= 22) lines.push("不過等等記得早點睡喵。");
  return lines;
}
// 互動選項（說說話時的三個按鈕）
export const TALK_CHOICES = [
  { id: "pat", label: "🤲 摸摸頭", mood: 8, affection: 2, reply: "呼嚕嚕～好舒服喵。" },
  { id: "praise", label: "🌟 稱讚牠", mood: 10, affection: 1, reply: "嘿嘿，被誇獎了喵！我會更努力陪你的。" },
  { id: "study", label: "📖 一起讀書", mood: 4, affection: 3, reply: "好！我把書翻開，你專心讀，我在旁邊看著喵。", buff: true },
];
// 陪讀加成：下一次測驗金幣 +20%（存在 petData.studyBuff = { until }）
export const STUDY_BUFF_MINUTES = 30;
export const STUDY_BUFF_RATE = 1.2;
export function studyBuffActive(buff, now = Date.now()) {
  return !!(buff && buff.until && buff.until > now);
}
