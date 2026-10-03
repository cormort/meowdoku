// tests/story.test.mjs — 驗證主線劇情／任務進度／貓咪提醒的邏輯
// 用法：node tests/story.test.mjs
import {
  STORY,
  STUDY_BUFF_MINUTES,
  applyEvent,
  currentChapter,
  newStoryState,
  normalizeStory,
  reminderLine,
  studyBuffActive,
  taskProgress,
  timeGreeting,
} from "../js/story.js";

let failures = 0;
function check(ok, label) {
  console.log(`  ${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failures++;
}

console.log("=== 劇情與任務 ===");
let s = newStoryState();
check(currentChapter(s).id === STORY.chapters[0].id, "一開始是第一章");
check(STORY.chapters.length >= 5, `劇本至少 5 章（目前 ${STORY.chapters.length} 章）`);
check(
  STORY.chapters.every((c) => c.lines?.length && c.task?.type && c.task?.target > 0 && c.reward?.coins > 0),
  "每一章都有台詞、任務目標與獎勵",
);
check(taskProgress(s).percent === 0, "任務進度一開始是 0%");

s = applyEvent(s, "quiz_correct", 1).story;
check(taskProgress(s).have === 1 && taskProgress(s).percent === 33, "答對 1 題後進度 33%");
s = applyEvent(s, "quiz_correct", 2).story;
check(s.chapterIndex === 1 && taskProgress(s).have === 0, "達成目標就進到下一章，進度歸零");
check(s.done.includes(STORY.chapters[0].id), "完成的章節會被記錄");

console.log("=== 不同任務類型 ===");
let s2 = { chapterIndex: 1, progress: {}, done: [] }; // 第二章：錯題重練 2 題
const r = applyEvent(s2, "mistake_fix", 2);
check(!!r.completed && r.completed.id === STORY.chapters[1].id, "錯題重練任務可完成");
let s3 = { chapterIndex: 2, progress: {}, done: [] }; // 第三章：照顧 3 次
check(applyEvent(s3, "care", 2).completed === null, "照顧 2 次還沒完成");
check(!!applyEvent(applyEvent(s3, "care", 2).story, "care", 1).completed, "照顧滿 3 次完成");
check(applyEvent({ chapterIndex: 2, progress: {}, done: [] }, "trip", 1).completed === null, "不相關的事件不會誤完成任務");
check(applyEvent(null, "quiz_correct", 1).story.chapterIndex === 0, "壞掉的存檔會自動修好");

console.log("=== 貓咪提醒 ===");
const hungry = reminderLine({ hunger: 10, energy: 100, mistakes: 5 });
check(hungry.includes("餓"), "肚子餓優先提醒吃飯");
const tired = reminderLine({ hunger: 100, energy: 5, mistakes: 5 });
check(tired.includes("累"), "體力低優先提醒休息");
const mistakes = reminderLine({ hunger: 100, energy: 100, mood: 80, mistakes: 4 });
check(mistakes.includes("錯題本"), "有錯題時提醒複習錯題");
const task = reminderLine({ hunger: 100, energy: 100, mood: 80, mistakes: 0, story: newStoryState() });
check(task.includes("任務"), "沒特別狀況時提醒當前任務");
const done = reminderLine({ story: { chapterIndex: STORY.chapters.length, progress: {}, done: [] } });
check(typeof done === "string" && done.length > 0, "全破後還是有台詞");
check(typeof timeGreeting(new Date("2026-10-03T08:00:00")) === "string", "會依時間給招呼語");

console.log("=== 陪讀加成 ===");
check(studyBuffActive({ until: Date.now() + 60000 }), "陪讀中");
check(!studyBuffActive({ until: Date.now() - 1000 }), "陪讀已過期");
check(!studyBuffActive(null), "沒有陪讀時不會加成");
check(STUDY_BUFF_MINUTES === 30, "陪讀時間 30 分鐘");

console.log("=== 舊存檔相容 ===");
check(normalizeStory(undefined).chapterIndex === 0, "沒有劇情欄位時從第一章開始");
check(normalizeStory({ progress: { quiz_correct: 2 } }).progress.quiz_correct === 2, "保留既有進度");

console.log(failures ? `\n${failures} 項失敗` : "\n全部通過");
process.exit(failures ? 1 : 0);
