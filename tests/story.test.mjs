// tests/story.test.mjs — 驗證主線劇情（考試章節）、貓咪提醒與陪讀
// 用法：node tests/story.test.mjs
import {
  STORY,
  STUDY_BUFF_MINUTES,
  applyEvent,
  currentChapter,
  dirtLevel,
  examPassed,
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

console.log("=== 劇情與考試章節 ===");
let s = newStoryState();
check(currentChapter(s).id === STORY.chapters[0].id, "一開始是第一章");
check(STORY.chapters.length >= 5, `劇本至少 5 章（目前 ${STORY.chapters.length} 章）`);
check(
  STORY.chapters.every((c) => c.lines?.length && c.task?.type && c.task?.target > 0 && c.reward?.coins > 0),
  "每一章都有台詞、任務目標與獎勵",
);
check(!!currentChapter(s).exam, "每一章都是一場考試（期中考或期末考）");
check(
  STORY.chapters.every((c) => c.exam && /^[4-7]-[12]$/.test(c.exam.term) && c.exam.count >= c.exam.pass),
  "考試都有冊次、題數與及格門檻",
);
check(
  STORY.chapters.every((c) => ["mid", "final"].includes(c.exam.kind)),
  "考試分為期中考與期末考",
);
check(
  STORY.chapters.filter((c) => c.exam.kind === "mid").length >= 2 &&
    STORY.chapters.filter((c) => c.exam.kind === "final").length >= 2,
  "期中考與期末考輪流出現",
);
check(examPassed(3, { pass: 3 }) && !examPassed(2, { pass: 3 }), "達標才算通過考試");
check(taskProgress(s).percent === 0, "任務進度一開始是 0%");

const first = STORY.chapters[0];
s = applyEvent(s, "exam", 1).story;
check(s.chapterIndex === 1 && taskProgress(s).have === 0, "考過第一章就進到下一章，進度歸零");
check(s.done.includes(first.id), "通過的章節會被記錄");
check(applyEvent(newStoryState(), "quiz_correct", 3).completed === null, "一般答題不會誤通過考試章節");
check(!!applyEvent(newStoryState(), "exam", 1).completed, "考試事件會完成章節");
check(applyEvent(null, "exam", 1).story.chapterIndex === 1 && normalizeStory(undefined).done.length === 0, "壞掉的存檔會自動修好且不影響進度計算");

console.log("=== 貓咪變髒 ===");
check(dirtLevel(90) === 0 && dirtLevel(60) === 0, "乾淨度 60 以上算乾淨");
check(dirtLevel(50) === 1 && dirtLevel(30) === 2 && dirtLevel(10) === 3, "越髒等級越高");
check(dirtLevel(undefined) === 0, "沒有乾淨度資料時視為乾淨");
check(reminderLine({ cleanliness: 10 }).includes("澡"), "太髒時會提醒洗澡");

console.log("=== 貓咪提醒 ===");
check(reminderLine({ hunger: 10, energy: 100, cleanliness: 100, mistakes: 5 }).includes("餓"), "肚子餓優先提醒吃飯");
check(reminderLine({ hunger: 100, energy: 5, cleanliness: 100, mistakes: 5 }).includes("累"), "體力低優先提醒休息");
check(
  reminderLine({ hunger: 100, energy: 100, cleanliness: 10, mood: 80, mistakes: 5 }).includes("澡"),
  "髒污的提醒會在心情與錯題之前",
);
check(reminderLine({ hunger: 100, energy: 100, cleanliness: 100, mood: 80, mistakes: 4 }).includes("錯題本"), "有錯題時提醒複習錯題");
check(
  reminderLine({ hunger: 100, energy: 100, cleanliness: 100, mood: 80, mistakes: 0, story: newStoryState() }).includes("任務"),
  "沒特別狀況時提醒當前任務",
);
check(
  typeof reminderLine({ story: { chapterIndex: STORY.chapters.length, progress: {}, done: [] } }) === "string",
  "全破後還是有台詞",
);
check(typeof timeGreeting(new Date("2026-10-03T08:00:00")) === "string", "會依時間給招呼語");

console.log("=== 陪讀加成 ===");
check(studyBuffActive({ until: Date.now() + 60000 }), "陪讀中");
check(!studyBuffActive({ until: Date.now() - 1000 }), "陪讀已過期");
check(!studyBuffActive(null), "沒有陪讀時不會加成");
check(STUDY_BUFF_MINUTES === 30, "陪讀時間 30 分鐘");

console.log("=== 舊存檔相容 ===");
check(normalizeStory(undefined).chapterIndex === 0, "沒有劇情欄位時從第一章開始");
check(normalizeStory({ progress: { exam: 1 } }).progress.exam === 1, "保留既有進度");

console.log(failures ? `\n${failures} 項失敗` : "\n全部通過");
process.exit(failures ? 1 : 0);
