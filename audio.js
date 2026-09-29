// 貓咪邏輯謎題 音訊系統 (Web Audio BGM & SFX Engine)
// 純瀏覽器原生 Web Audio API 合成，零外部依賴、零延遲、離線可用。

class MeowAudioEngine {
  constructor() {
    this.ctx = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.masterGain = null;
    
    // 呼嚕音效節點
    this.purrOsc = null;
    this.purrGain = null;
    this.purrLfo = null;
    this.isPurring = false;
    
    // 設定
    this.bgmEnabled = localStorage.getItem('meowdoku.bgm') === '1'; // 預設開啟或由使用者開關
    this.sfxEnabled = localStorage.getItem('meowdoku.sfx') !== '0'; // 預設開啟
    
    // BGM 播放狀態
    this.isPlayingBgm = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.bpm = 78; // 悠閒放鬆的 Lofi 步調
    
    // 溫馨貓咪咖啡廳和弦進程 (Fmaj7 - G - Em7 - Am7 - Dm7 - G7 - Cmaj7 - C7)
    this.chords = [
      // Fmaj7
      { root: 174.61, bass: 87.31, notes: [261.63, 329.63, 349.23, 440.00, 523.25] },
      // G6
      { root: 196.00, bass: 98.00, notes: [246.94, 293.66, 329.63, 392.00, 493.88] },
      // Em7
      { root: 164.81, bass: 82.41, notes: [246.94, 293.66, 329.63, 392.00, 493.88] },
      // Am7
      { root: 220.00, bass: 110.00, notes: [261.63, 329.63, 392.00, 440.00, 523.25] },
      // Dm7
      { root: 146.83, bass: 73.42, notes: [220.00, 261.63, 349.23, 440.00, 523.25] },
      // G7
      { root: 196.00, bass: 98.00, notes: [246.94, 293.66, 349.23, 392.00, 440.00] },
      // Cmaj7
      { root: 261.63, bass: 65.41, notes: [261.63, 329.63, 392.00, 493.88, 523.25] },
      // A7 (過渡)
      { root: 220.00, bass: 110.00, notes: [277.18, 329.63, 370.00, 440.00, 554.37] }
    ];
    
    // 旋律動機 (Pentatonic scales for cozy cat cafe vibes)
    this.melodyMotifs = [
      [523.25, null, 659.25, 783.99, 659.25, null, 523.25, null],
      [587.33, 659.25, 587.33, null, 493.88, null, 392.00, null],
      [440.00, null, 523.25, 659.25, null, 783.99, 880.00, null],
      [659.25, null, 587.33, 523.25, 392.00, null, 523.25, null]
    ];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(this.bgmEnabled ? 0.28 : 0.001, this.ctx.currentTime);
        this.bgmGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 0.6 : 0.001, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // ==================== 音樂 (BGM) 控制 ====================
  toggleBgm() {
    this.init();
    this.bgmEnabled = !this.bgmEnabled;
    localStorage.setItem('meowdoku.bgm', this.bgmEnabled ? '1' : '0');
    if (this.bgmGain && this.ctx) {
      const targetGain = this.bgmEnabled ? 0.28 : 0.001;
      this.bgmGain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 0.3);
    }
    if (this.bgmEnabled && !this.isPlayingBgm) {
      this.startBgm();
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('meowaudiochange', { detail: { bgm: this.bgmEnabled, sfx: this.sfxEnabled } }));
    }
    return this.bgmEnabled;
  }

  toggleSfx() {
    this.init();
    this.sfxEnabled = !this.sfxEnabled;
    localStorage.setItem('meowdoku.sfx', this.sfxEnabled ? '1' : '0');
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 0.6 : 0.001, this.ctx.currentTime);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('meowaudiochange', { detail: { bgm: this.bgmEnabled, sfx: this.sfxEnabled } }));
    }
    return this.sfxEnabled;
  }

  startBgm() {
    this.init();
    if (!this.ctx || this.isPlayingBgm) return;
    this.isPlayingBgm = true;
    this.bgmStep = 0;
    this.scheduleNextBar();
  }

  stopBgm() {
    this.isPlayingBgm = false;
    clearTimeout(this.bgmTimer);
  }

  // 播放音樂盒／電鋼琴音色音符
  playMusicBoxNote(freq, time, duration = 1.0, velocity = 0.5) {
    if (!this.ctx || !this.bgmGain || !freq) return;
    try {
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // 純淨正弦波 + 輕微倍頻泛音
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, time);
      filter.frequency.exponentialRampToValueAtTime(450, time + duration);

      const amp = velocity * 0.15;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(amp, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);

      osc.start(time);
      osc2.start(time);
      osc.stop(time + duration + 0.05);
      osc2.stop(time + duration + 0.05);
    } catch {}
  }

  // 播放溫暖低音
  playWarmBass(freq, time, duration = 1.6) {
    if (!this.ctx || !this.bgmGain || !freq) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.2, time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);

      osc.start(time);
      osc.stop(time + duration + 0.05);
    } catch {}
  }

  // 排程一個小節 (4 拍，8 個半拍)
  scheduleNextBar() {
    if (!this.isPlayingBgm || !this.ctx) return;
    const now = this.ctx.currentTime;
    const beatSec = 60 / this.bpm;
    const chordIdx = Math.floor(this.bgmStep / 8) % this.chords.length;
    const chord = this.chords[chordIdx];
    const motif = this.melodyMotifs[chordIdx % this.melodyMotifs.length];

    // 低音 (拍 1 與 拍 3)
    this.playWarmBass(chord.bass, now, beatSec * 1.8);
    this.playWarmBass(chord.bass, now + beatSec * 2, beatSec * 1.8);

    // 和弦琶音 (每個半拍)
    for (let i = 0; i < 8; i++) {
      const t = now + i * (beatSec / 2);
      const note = chord.notes[i % chord.notes.length];
      this.playMusicBoxNote(note, t, beatSec * 1.2, 0.45);

      // 上層旋律
      const melodyNote = motif[i];
      if (melodyNote) {
        this.playMusicBoxNote(melodyNote, t, beatSec * 1.5, 0.65);
      }
    }

    this.bgmStep += 8;
    const barDurationMs = beatSec * 4 * 1000;
    this.bgmTimer = setTimeout(() => {
      this.scheduleNextBar();
    }, barDurationMs - 40);
  }

  // ==================== 遊戲音效 (SFX) ====================

  // 1. 放貓咪 (清脆可愛的貓叫聲或貓咪撲爪音)
  playCatPlace() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // 柔和上揚的喵鳴 (520Hz -> 760Hz)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.22);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, now);
      filter.Q.setValueAtTime(2.2, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch {}
  }

  // 2. 標記/排除打叉 (輕巧鉛筆/按鍵聲)
  playMark() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(780, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.06);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  // 3. 清除單格
  playClear() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.08);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  // 4. 放錯扣小魚乾警告 (低沉失誤音)
  playError() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(140, now + 0.22);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(360, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.28);
    } catch {}
  }

  // 5. 提示音 (魔幻閃耀琶音)
  playHint() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);

        gain.gain.setValueAtTime(0.12, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.28);
      });
    } catch {}
  }

  // 6. 勝利通關 (歡快大合奏)
  playVictory() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [
        { f: 523.25, d: 0.12 }, { f: 659.25, d: 0.12 }, { f: 783.99, d: 0.12 },
        { f: 1046.5, d: 0.35 }, { f: 880.00, d: 0.15 }, { f: 1046.5, d: 0.6 }
      ];
      let offset = 0;
      notes.forEach((n) => {
        const t = now + offset;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + n.d + 0.05);
        offset += n.d * 0.85;
      });
    } catch {}
  }

  // 8. 貓咪呼嚕聲 (28Hz 低頻三角波 + 2.6Hz 呼吸調幅)
  startPurr() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || this.isPurring) return;
    try {
      const now = this.ctx.currentTime;
      this.purrOsc = this.ctx.createOscillator();
      this.purrOsc.type = 'triangle';
      this.purrOsc.frequency.setValueAtTime(29, now);

      this.purrLfo = this.ctx.createOscillator();
      this.purrLfo.type = 'sine';
      this.purrLfo.frequency.setValueAtTime(2.6, now);

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(0.08, now);

      this.purrGain = this.ctx.createGain();
      this.purrGain.gain.setValueAtTime(0.02, now);
      this.purrGain.gain.linearRampToValueAtTime(0.14, now + 0.3);

      this.purrLfo.connect(this.purrGain.gain);
      this.purrOsc.connect(this.purrGain);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, now);

      this.purrGain.connect(filter);
      filter.connect(this.sfxGain);

      this.purrOsc.start();
      this.purrLfo.start();
      this.isPurring = true;
    } catch {}
  }

  stopPurr() {
    if (!this.ctx || !this.isPurring) return;
    try {
      const now = this.ctx.currentTime;
      if (this.purrGain) {
        this.purrGain.gain.linearRampToValueAtTime(0.001, now + 0.25);
      }
      setTimeout(() => {
        try {
          if (this.purrOsc) { this.purrOsc.stop(); this.purrOsc.disconnect(); }
          if (this.purrLfo) { this.purrLfo.stop(); this.purrLfo.disconnect(); }
        } catch {}
        this.purrOsc = null;
        this.purrLfo = null;
        this.isPurring = false;
      }, 260);
    } catch {
      this.isPurring = false;
    }
  }

  // 9. 萌萌貓叫聲
  playMeow(pitch = 1.0) {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      const base = 560 * pitch;
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(base * 1.35, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(base * 0.85, now + 0.38);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950 * pitch, now);
      filter.Q.setValueAtTime(2.5, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch {}
  }

  // 10. 鈴鐺輕響 (逗貓棒 / 項圈)
  playJingle() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [2200, 2900, 3700].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.03);

        gain.gain.setValueAtTime(0.06, now + i * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.22);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now + i * 0.03);
        osc.stop(now + i * 0.03 + 0.25);
      });
    } catch {}
  }

  // 11. 鏟砂沙沙聲
  playSand() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.18;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      filter.Q.setValueAtTime(3.0, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.17);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start();
    } catch {}
  }

  // 12. 歡呼音效
  playCheer() {
    this.playVictory();
  }
}

export const audio = new MeowAudioEngine();
