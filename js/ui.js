// ui.js — 各畫面共用的小工具：DOM、儲存鍵、底部面板、提示音
import { audio } from "../audio.js";

export const $ = (id) => document.getElementById(id);
export const LS = {
  best: (n) => `meowdoku.best.${n}`,
  theme: "meowdoku.theme",
  autoX: "meowdoku.autoX",
  daily: "meowdoku.daily",
  resume: "meowdoku.resume",
  skin: "meowdoku.skin",
  pet: "meowdoku.pet",
  quizBest: (id) => `meowdoku.quizBest.${id}`,
};
export function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
let skinAudioContext = null;
export function showSheet(title, bodyHtml, primaryLabel, primaryFn, secondaryLabel = "", secondaryFn) {
  $("overlayTitle").textContent = title;
  $("overlayBody").innerHTML = bodyHtml;
  const p = $("overlayPrimary");
  p.textContent = primaryLabel;
  p.onclick = () => {
    hideSheet();
    primaryFn && primaryFn();
  };
  const s = $("overlaySecondary");
  if (secondaryLabel) {
    s.textContent = secondaryLabel;
    s.style.display = "";
    s.onclick = () => {
      hideSheet();
      secondaryFn && secondaryFn();
    };
  } else s.style.display = "none";
  $("overlay").classList.remove("hidden");
}
export function hideSheet() {
  $("overlay").classList.add("hidden");
}
export function getSkinAudioContext() {
  if (!audio.sfxEnabled) return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!skinAudioContext)
    try {
      skinAudioContext = new AC();
    } catch {
      return null;
    }
  if (skinAudioContext.state === "suspended") skinAudioContext.resume().catch(() => {});
  return skinAudioContext;
}
export function playSkinTone({
  frequency = 440,
  endFrequency = frequency,
  duration = 0.1,
  volume = 0.035,
  type = "sine",
  delay = 0,
} = {}) {
  const c = getSkinAudioContext();
  if (!c) return;
  const start = c.currentTime + delay,
    end = start + duration,
    o = c.createOscillator(),
    g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(Math.max(40, frequency), start);
  o.frequency.exponentialRampToValueAtTime(Math.max(40, endFrequency), end);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, volume),
    start + Math.min(0.018, duration / 3),
  );
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  o.connect(g);
  g.connect(c.destination);
  o.start(start);
  o.stop(end + 0.02);
}
export function playSkinLaunchSound() {
  playSkinTone({ frequency: 280, endFrequency: 620, duration: 0.16, volume: 0.032 });
  playSkinTone({
    frequency: 520,
    endFrequency: 860,
    duration: 0.11,
    volume: 0.018,
    type: "triangle",
    delay: 0.045,
  });
}
export function playSkinTrailSound(p) {
  playSkinTone({
    frequency: 620 + p * 280,
    endFrequency: (620 + p * 280) * 1.08,
    duration: 0.045,
    volume: 0.008,
  });
}
export function playSkinArrivalSound() {
  playSkinTone({ frequency: 523.25, endFrequency: 659.25, duration: 0.17, volume: 0.03 });
  playSkinTone({
    frequency: 659.25,
    endFrequency: 783.99,
    duration: 0.2,
    volume: 0.025,
    type: "triangle",
    delay: 0.035,
  });
  playSkinTone({
    frequency: 783.99,
    endFrequency: 1046.5,
    duration: 0.22,
    volume: 0.018,
    delay: 0.07,
  });
}
