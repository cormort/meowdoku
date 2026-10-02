// room.js — 客廳互動：貓咪立繪與姿態、逗貓棒、貓砂盆、拍照留念
import { audio } from "../audio.js";
import { activePetKey, addEventProgress, checkGrowthUpgrade, growthStage, interactPet, petAffection, petData, petLevel, petMoodValue, petName, primaryTitle, savePetData, selectedCostume, showPetHome, updatePetHeroStats } from "./pet.js";
import { $, showSheet } from "./ui.js";
const ROOM_CAT_BREEDS = {
  "0": "white",
  "1": "black",
  "2": "orange",
  "3": "orange",
  "4": "calico",
  "5": "white",
  "6": "white",
  "7": "calico",
  "8": "orange",
  "9": "white",
  "10": "white",
  "11": "orange",
  "12": "black",
};
function getRoomCatBreed(key) {
  const k = String(key);
  if (ROOM_CAT_BREEDS[k]) return ROOM_CAT_BREEDS[k];
  const breeds = ["white", "orange", "calico", "black"];
  return breeds[(Number(k) || 0) % 4];
}
export function getRoomCatSprite(key, pose = "idle") {
  const breed = getRoomCatBreed(key);
  const prefix = breed === "white" ? "cat" : breed;
  return `./icons/room/${prefix}_${pose}.webp`;
}
export let roomCatPose = "idle";
let roomCatTimer = null;
// 各姿勢立繪自動回到 idle 的時間（毫秒）。沒有列在這裡的姿勢（例如 sleep）會一直保持。
const POSE_HOLD_MS = {
  pet: 3200,
  play: 3200,
  walk: 2600,
  run: 2000,
  jump: 1600,
  lick: 2600,
  wash: 2400,
  stretch: 2600,
  tail: 2600,
  yawn: 2400,
  scratch: 2600,
  eat: 3200,
};
// 立繪圖鑑用：動作姿勢（不含 idle/sleep，那兩個另外處理）
export const ACTION_POSES = [
  { key: "walk", icon: "🚶", label: "走路" },
  { key: "run", icon: "💨", label: "暴衝" },
  { key: "jump", icon: "⬆️", label: "跳躍" },
  { key: "lick", icon: "👅", label: "舔腳掌" },
  { key: "wash", icon: "✨", label: "洗臉" },
  { key: "stretch", icon: "💫", label: "伸懶腰" },
  { key: "tail", icon: "🌀", label: "追尾巴" },
  { key: "yawn", icon: "🥱", label: "打哈欠" },
  { key: "scratch", icon: "🙅", label: "磨爪爪" },
  { key: "eat", icon: "🍽️", label: "吃飯飯" },
  { key: "pet", icon: "💕", label: "討摸摸" },
  { key: "play", icon: "🧶", label: "玩逗貓棒" },
  { key: "sleep", icon: "💤", label: "打盹" },
];
export function spawnRoomHeart(x, y, emoji = "❤️") {
  const container = $("roomHearts");
  if (!container) return;
  const heart = document.createElement("span");
  heart.className = "room-heart-particle";
  heart.textContent = emoji;
  heart.style.left = `${x || (42 + Math.random() * 20)}%`;
  heart.style.bottom = `${y || (30 + Math.random() * 30)}%`;
  heart.style.setProperty("--rot", `${(Math.random() - 0.5) * 40}deg`);
  container.appendChild(heart);
  setTimeout(() => heart.remove(), 1400);
}
export function setRoomCatPose(pose, text, animClass = "pet-bounce", holdMs) {
  roomCatPose = pose;
  const img = $("roomCatImg");
  const key = activePetKey();
  if (img) {
    img.src = getRoomCatSprite(key, pose);
    img.className = `room-cat-img ${animClass}`;
  }
  const speech = $("petSpeech");
  if (speech && text) {
    speech.textContent = text;
    speech.classList.remove("show");
    void speech.offsetWidth;
    speech.classList.add("show");
  }
  clearTimeout(roomCatTimer);
  const hold = holdMs ?? POSE_HOLD_MS[pose];
  if (hold) {
    roomCatTimer = setTimeout(() => {
      roomCatPose = "idle";
      const curImg = $("roomCatImg");
      if (curImg) {
        curImg.src = getRoomCatSprite(activePetKey(), "idle");
        curImg.className = "room-cat-img";
      }
    }, hold);
  }
}
export let roomLitterClumps = 2;
export let roomToolMode = "pet"; // "pet" | "wand" | "litter" | "rest"

export function renderRoomLitter() {
  const container = $("roomLitterClumps");
  const badge = $("roomLitterBadge");
  if (!container) return;
  container.innerHTML = "";
  const cleanRate = Math.max(0, Math.round((1 - roomLitterClumps / 3) * 100));
  if (badge) {
    if (cleanRate === 100) {
      badge.textContent = "✨ 乾淨度 100%";
      badge.className = "room-litter-badge clean";
    } else {
      badge.textContent = `🧹 乾淨度 ${cleanRate}%`;
      badge.className = "room-litter-badge";
    }
  }
  const positions = [
    { x: 32, y: 38 },
    { x: 58, y: 48 },
    { x: 44, y: 62 },
  ];
  for (let i = 0; i < roomLitterClumps; i++) {
    const pos = positions[i % positions.length];
    const clump = document.createElement("div");
    clump.className = "room-sand-clump";
    clump.dataset.clumpIndex = String(i);
    clump.style.left = `${pos.x}%`;
    clump.style.top = `${pos.y}%`;
    clump.title = "點擊鏟除便便";
    clump.innerHTML = `<img src="./icons/room/poop_clump.webp" alt="便便" onerror="this.onerror=null; this.src='./icons/room/poop_clump.png';">`;
    container.appendChild(clump);
  }
}

// 貓咪自己上廁所（最多 3 坨）
export function addLitterClump() {
  roomLitterClumps = Math.min(3, roomLitterClumps + 1);
  renderRoomLitter();
}
export function scoopLitterClump(clumpEl) {
  if (roomLitterClumps <= 0) {
    setRoomCatPose("pet", "貓砂盆已經超級乾淨了喵！✨", "pet-bounce");
    return;
  }
  audio.init();
  audio.playSand();
  navigator.vibrate?.(25);

  if (clumpEl) {
    clumpEl.classList.add("scooped");
  }

  const rect = (clumpEl || $("roomLitterCorner"))?.getBoundingClientRect();
  const stageRect = $("petRoomStage")?.getBoundingClientRect();
  if (rect && stageRect) {
    const px = ((rect.left + rect.width / 2 - stageRect.left) / stageRect.width) * 100;
    const py = (1 - (rect.top + rect.height / 2 - stageRect.top) / stageRect.height) * 100;
    spawnRoomHeart(px, py, "✨");
    setTimeout(() => spawnRoomHeart(px + (Math.random() - 0.5) * 8, py + 5, "⭐"), 100);
  }

  roomLitterClumps = Math.max(0, roomLitterClumps - 1);
  setTimeout(() => renderRoomLitter(), 160);

  const key = activePetKey();
  const beforeStage = growthStage(petAffection(key)).index;
  petData.affection[key] = (petData.affection[key] || 0) + 3;
  petData.mood[key] = Math.min(100, petMoodValue(key) + 5);
  addEventProgress("play", 1);
  savePetData();
  checkGrowthUpgrade(key, beforeStage);
  updatePetHeroStats(key);

  if (roomLitterClumps === 0) {
    audio.playVictory();
    audio.playMeow(1.18);
    setRoomCatPose("pet", "哇！貓砂盆好乾淨！最愛主人了喵～✨", "pet-bounce");
    for (let i = 0; i < 5; i++) {
      setTimeout(
        () =>
          spawnRoomHeart(
            70 + (Math.random() - 0.5) * 20,
            20 + Math.random() * 30,
            ["💖", "✨", "🌸", "⭐"][i % 4],
          ),
        i * 140,
      );
    }
    setTimeout(() => {
      if (roomLitterClumps === 0) {
        roomLitterClumps = 2;
        renderRoomLitter();
      }
    }, 30000);
  } else {
    setRoomCatPose("idle", "沙沙沙～鏟乾淨了！好舒服喵🧹");
  }
}

export function triggerWandPlay(e) {
  audio.init();
  audio.playJingle();
  audio.playMeow(1.22);
  navigator.vibrate?.([15, 20]);

  const follower = $("roomWandFollower");
  if (follower) {
    const wandImg = follower.querySelector(".room-wand-img");
    if (wandImg) {
      wandImg.classList.remove("wand-whip");
      void wandImg.offsetWidth;
      wandImg.classList.add("wand-whip");
    }
  }

  const stage = $("petRoomStage");
  if (e && stage) {
    const rect = stage.getBoundingClientRect();
    const px = Math.max(10, Math.min(90, ((e.clientX - rect.left) / rect.width) * 100));
    const py = Math.max(10, Math.min(90, (1 - (e.clientY - rect.top) / rect.height) * 100));
    spawnRoomHeart(px, py, "🪶");
    spawnRoomHeart(px + (Math.random() - 0.5) * 8, py + 4, "⭐");
    spawnRoomHeart(px + (Math.random() - 0.5) * 8, py - 4, "🐾");
  }

  const key = activePetKey();
  const beforeStage = growthStage(petAffection(key)).index;
  petData.affection[key] = (petData.affection[key] || 0) + 2;
  petData.mood[key] = Math.min(100, petMoodValue(key) + 6);
  addEventProgress("play", 1);
  savePetData();
  checkGrowthUpgrade(key, beforeStage);
  updatePetHeroStats(key);

  const wandQuotes = [
    "撲到了！好身手喵！⚡",
    "看我的貓貓無影爪！🐾",
    "抓住毛毛了！太好玩了喵！",
    "喵哈哈！逗貓棒逃不出我的手心！",
  ];
  const quote = wandQuotes[Math.floor(Math.random() * wandQuotes.length)];
  setRoomCatPose("play", quote, "pet-wiggle");
}

export function bindRoomStageInteractions() {
  const stage = $("petRoomStage");
  if (!stage || stage.dataset.boundWand === "true") return;
  stage.dataset.boundWand = "true";

  let lastJingleTime = 0;

  stage.addEventListener("pointermove", (e) => {
    if (roomToolMode !== "wand") return;
    const follower = $("roomWandFollower");
    if (!follower) return;
    const rect = stage.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    follower.style.transform = `translate(${x - 42}px, ${y - 42}px)`;

    const catImg = $("roomCatImg");
    if (catImg) {
      const catRect = catImg.getBoundingClientRect();
      const catCenterX = catRect.left - rect.left + catRect.width / 2;
      const deltaX = (x - catCenterX) / 20;
      const clampedDeltaX = Math.max(-10, Math.min(10, deltaX));
      catImg.style.transform = `translateX(${clampedDeltaX}px) rotate(${clampedDeltaX * 0.35}deg)`;
    }

    const now = Date.now();
    if (now - lastJingleTime > 900) {
      lastJingleTime = now;
      audio.playJingle();
    }
  });

  stage.addEventListener("pointerleave", () => {
    const catImg = $("roomCatImg");
    if (catImg && roomToolMode === "wand") {
      catImg.style.transform = "";
    }
  });
}

export function setRoomToolMode(mode) {
  roomToolMode = mode;
  document.querySelectorAll("[data-room-mode]").forEach((b) => {
    b.classList.toggle("active", b.dataset.roomMode === mode);
  });
  const stage = $("petRoomStage");
  const hint = $("petRoomHint");
  audio.init();

  if (mode === "wand") {
    stage?.classList.add("wand-active");
    audio.playJingle();
    audio.playMeow(1.2);
    setRoomCatPose("play", "哇！好玩的逗貓棒！看爪！🐾", "pet-wiggle");
    if (hint) hint.textContent = "🪶 在客廳移動帶動逗貓棒，點擊讓貓咪飛撲！";
  } else if (mode === "litter") {
    stage?.classList.remove("wand-active");
    if (roomLitterClumps > 0) {
      scoopLitterClump();
    } else {
      setRoomCatPose("pet", "貓砂盆已經超級乾淨了喵！✨", "pet-bounce");
    }
    if (hint) hint.textContent = "🧹 點擊貓砂盆裡的便便把它們鏟乾淨吧！";
  } else if (mode === "rest") {
    stage?.classList.remove("wand-active");
    interactPet("rest");
    if (hint) hint.textContent = "💤 貓咪正在香甜小憩充電中...";
  } else {
    // "pet"
    stage?.classList.remove("wand-active");
    interactPet("pet");
    if (hint) hint.textContent = "👋 輕觸貓咪可以摸摸互動喔！";
  }
}

function drawRoundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

export function captureRoomPhoto() {
  if (typeof audio !== "undefined") {
    audio.init?.();
    audio.playShutter?.();
  }
  navigator.vibrate?.(35);

  const stage = $("petRoomStage");
  if (!stage) return;

  // Flash animation
  const flash = document.createElement("div");
  flash.className = "room-camera-flash flash";
  stage.appendChild(flash);
  setTimeout(() => flash.remove(), 480);

  const canvas = document.createElement("canvas");
  const cw = 800;
  const ch = 960;
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");

  // 1. Polaroid Outer Card (Warm cream paper)
  ctx.fillStyle = "#faf8f5";
  drawRoundRect(ctx, 0, 0, cw, ch, 28);
  ctx.fill();

  ctx.strokeStyle = "#eae5db";
  ctx.lineWidth = 3;
  ctx.stroke();

  // 2. Inner Photo Frame (x: 44, y: 44, w: 712, h: 700)
  const fx = 44, fy = 44, fw = 712, fh = 700;
  ctx.save();
  drawRoundRect(ctx, fx, fy, fw, fh, 16);
  ctx.clip();

  // Room Background
  if (petData.roomWallpaper === "tatami") {
    const bgGrad = ctx.createLinearGradient(fx, fy, fx, fy + fh);
    bgGrad.addColorStop(0, "#fdf6e9");
    bgGrad.addColorStop(1, "#f1e3be");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(fx, fy, fw, fh);
    ctx.save();
    ctx.strokeStyle = "rgba(180, 150, 100, 0.18)";
    ctx.lineWidth = 1.5;
    for (let y = fy; y < fy + fh; y += 28) {
      ctx.beginPath();
      ctx.moveTo(fx, y);
      ctx.lineTo(fx + fw, y);
      ctx.stroke();
    }
    ctx.restore();
  } else {
    const bgGrad = ctx.createRadialGradient(fx + fw / 2, fy + fh * 0.25, 40, fx + fw / 2, fy + fh * 0.45, fw * 0.7);
    bgGrad.addColorStop(0, "#fffdf8");
    bgGrad.addColorStop(0.7, "#f2f5f3");
    bgGrad.addColorStop(1, "#e6ece8");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(fx, fy, fw, fh);
  }

  // Rug
  ctx.save();
  const rugX = fx + fw / 2;
  const rugY = fy + fh - 80;
  const rugRx = 230;
  const rugRy = 48;
  const rugGrad = ctx.createRadialGradient(rugX, rugY, 20, rugX, rugY, rugRx);
  rugGrad.addColorStop(0, "rgba(235, 215, 190, 0.85)");
  rugGrad.addColorStop(0.7, "rgba(220, 195, 165, 0.45)");
  rugGrad.addColorStop(1, "rgba(220, 195, 165, 0)");
  ctx.fillStyle = rugGrad;
  ctx.beginPath();
  ctx.ellipse(rugX, rugY, rugRx, rugRy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Left Furniture: Cat Tree (if placed)
  if (petData.roomFurniture?.cattree) {
    const cattreeEl = $("roomFurnitureCattree");
    if (cattreeEl && cattreeEl.complete && cattreeEl.naturalWidth > 0) {
      const treeW = 155;
      const treeH = cattreeEl.naturalHeight * (treeW / cattreeEl.naturalWidth);
      const treeX = fx + 16;
      const treeY = fy + fh - treeH - 45;
      ctx.drawImage(cattreeEl, treeX, treeY, treeW, treeH);
    }
  }

  // Mid-Left Furniture: Kotatsu (if placed)
  if (petData.roomFurniture?.kotatsu) {
    const kotatsuEl = $("roomFurnitureKotatsu");
    if (kotatsuEl && kotatsuEl.complete && kotatsuEl.naturalWidth > 0) {
      const kw = 175;
      const kh = kotatsuEl.naturalHeight * (kw / kotatsuEl.naturalWidth);
      const kx = fx + 150;
      const ky = fy + fh - kh - 24;
      ctx.drawImage(kotatsuEl, kx, ky, kw, kh);
    }
  }

  // Cat
  const catImg = $("roomCatImg");
  if (catImg && catImg.complete && catImg.naturalWidth > 0) {
    const catH = 430;
    const catW = catImg.naturalWidth * (catH / catImg.naturalHeight);
    const catX = fx + (fw - catW) / 2;
    const catY = fy + fh - catH - 50;
    ctx.drawImage(catImg, catX, catY, catW, catH);

    // Costume Sprite Overlay (if equipped)
    const activeCostume = selectedCostume(activePetKey());
    if (activeCostume && activeCostume.image) {
      const costImg = stage.querySelector(".costume-layer-sprite");
      if (costImg && costImg.complete && costImg.naturalWidth > 0) {
        ctx.drawImage(costImg, catX, catY, catW, catH);
      }
    }
  }

  // Corner Litter Box
  const litterImg = stage.querySelector(".room-litter-img");
  if (litterImg && litterImg.complete && litterImg.naturalWidth > 0) {
    const lw = 180;
    const lh = litterImg.naturalHeight * (lw / litterImg.naturalWidth);
    const lx = fx + fw - lw - 20;
    const ly = fy + fh - lh - 20;
    ctx.drawImage(litterImg, lx, ly, lw, lh);

    if (roomLitterClumps > 0) {
      const poopImg = stage.querySelector(".room-sand-clump img");
      if (poopImg && poopImg.complete && poopImg.naturalWidth > 0) {
        const positions = [
          { x: lx + lw * 0.32, y: ly + lh * 0.40 },
          { x: lx + lw * 0.58, y: ly + lh * 0.50 },
          { x: lx + lw * 0.44, y: ly + lh * 0.64 },
        ];
        for (let i = 0; i < roomLitterClumps; i++) {
          const p = positions[i % positions.length];
          ctx.drawImage(poopImg, p.x - 22, p.y - 22, 44, 44);
        }
      }
    }
  }

  // Speech bubble
  const speechEl = $("petSpeech");
  const speechText = speechEl?.textContent?.trim();
  if (speechText) {
    ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const textMetrics = ctx.measureText(speechText);
    const bw = Math.min(fw * 0.6, textMetrics.width + 36);
    const bh = 54;
    const bx = fx + fw - bw - 20;
    const by = fy + 24;

    ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.14)";
    ctx.shadowBlur = 12;
    drawRoundRect(ctx, bx, by, bw, bh, 16);
    ctx.fill();
    ctx.shadowColor = "transparent";

    ctx.strokeStyle = "#40796d";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#1c2b27";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(speechText, bx + bw / 2, by + bh / 2, bw - 20);
  }

  ctx.restore(); // end clip

  // 3. Bottom Polaroid Margins
  const key = activePetKey();
  const name = petName(key);
  const aff = petAffection(key);
  const level = petLevel(aff);
  const stageInfo = growthStage(aff);
  const title = primaryTitle(key);
  const d = new Date();
  const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;

  ctx.textAlign = "left";
  ctx.fillStyle = "#1e293b";
  ctx.font = "800 34px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(`🐾 ${name}`, 52, 818);

  ctx.fillStyle = "#3b7a6d";
  ctx.font = "700 22px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(`Lv.${level} · ${stageInfo.name}`, 54, 856);

  ctx.fillStyle = "#64748b";
  ctx.font = "600 20px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(`🏅 ${title}`, 54, 890);

  ctx.textAlign = "right";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "700 22px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(dateStr, cw - 52, 822);

  ctx.fillStyle = "#9333ea";
  ctx.font = "italic 700 20px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Meowdoku Memories 🐾", cw - 52, 890);

  const dataUrl = canvas.toDataURL("image/png");
  setTimeout(() => showPhotoSheet(dataUrl), 200);
}

function showPhotoSheet(dataUrl) {
  const body = `
    <div class="photo-preview-wrap">
      <div class="photo-card-frame">
        <img src="${dataUrl}" class="photo-preview-img" alt="貓咪生活照">
      </div>
      <div class="photo-actions-row">
        <a href="${dataUrl}" download="meowdoku_cat_${Date.now()}.png" class="photo-action-btn primary" id="btnDownloadPhoto">💾 下載相片</a>
        <button class="photo-action-btn" id="btnSharePhoto">📲 分享紀念照</button>
        <button class="photo-action-btn" id="btnClosePhoto">返回客廳</button>
      </div>
    </div>
  `;
  showSheet("📸 貓咪生活照留念", body, "完成");

  $("btnClosePhoto")?.addEventListener("click", () => showPetHome());
  $("btnSharePhoto")?.addEventListener("click", async () => {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "meowdoku_cat.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "貓咪生活紀念照",
          text: "看看我的可愛貓咪！🐾",
          files: [file],
        });
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `meowdoku_cat_${Date.now()}.png`;
        link.click();
      }
    } catch {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `meowdoku_cat_${Date.now()}.png`;
      link.click();
    }
  });
}

