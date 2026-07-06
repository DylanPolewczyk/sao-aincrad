// Procedural WebAudio sound — no asset files, everything synthesized.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bgmGain = null;
    this.bgmTimer = null;
  }

  // Must be called from a user gesture (Link Start click).
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.startBGM();
  }

  now() { return this.ctx ? this.ctx.currentTime : 0; }

  tone(freq, dur, { type = 'sine', vol = 0.2, attack = 0.005, glide = 0, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.now() + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + glide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  noise(dur, { vol = 0.2, freq = 1200, q = 1, sweep = 0, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.now() + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + sweep), t + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }

  swish() { this.noise(0.18, { vol: 0.16, freq: 2600, sweep: -1800, q: 1.4 }); }
  hit() {
    this.noise(0.08, { vol: 0.3, freq: 900, q: 0.8 });
    this.tone(180, 0.09, { type: 'square', vol: 0.12, glide: -90 });
  }
  crit() {
    this.hit();
    this.tone(880, 0.15, { type: 'triangle', vol: 0.18, glide: 340 });
  }
  hurt() {
    this.tone(140, 0.22, { type: 'sawtooth', vol: 0.18, glide: -70 });
    this.noise(0.12, { vol: 0.2, freq: 500, q: 0.7 });
  }
  shatter() {
    // glassy burst — several high pings + noise
    this.noise(0.35, { vol: 0.22, freq: 5200, sweep: -2600, q: 2 });
    [2093, 2637, 3136, 3951].forEach((f, i) =>
      this.tone(f, 0.3, { type: 'sine', vol: 0.07, delay: i * 0.02 }));
  }
  skill() {
    this.noise(0.3, { vol: 0.18, freq: 1800, sweep: 2400, q: 2.5 });
    this.tone(523, 0.25, { type: 'triangle', vol: 0.12, glide: 523 });
  }
  levelUp() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.tone(f, 0.5, { type: 'triangle', vol: 0.16, delay: i * 0.11 }));
  }
  bossRoar() {
    this.tone(70, 1.1, { type: 'sawtooth', vol: 0.25, glide: -30 });
    this.noise(0.9, { vol: 0.18, freq: 300, sweep: -180, q: 0.6 });
  }
  victory() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) =>
      this.tone(f, 0.7, { type: 'triangle', vol: 0.14, delay: i * 0.14 }));
  }
  linkStart() {
    this.noise(1.4, { vol: 0.16, freq: 600, sweep: 5200, q: 1.8 });
    this.tone(440, 1.2, { type: 'sine', vol: 0.12, glide: 880 });
  }

  // Gentle ambient pad, two slowly alternating chords.
  startBGM() {
    if (!this.ctx || this.bgmTimer) return;
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.05;
    this.bgmGain.connect(this.master);
    const chords = [
      [220, 277.18, 329.63, 440],   // A major-ish
      [196, 246.94, 293.66, 392],   // G
      [174.61, 220, 261.63, 349.23],// F
      [196, 246.94, 311.13, 392],   // Gm color
    ];
    let idx = 0;
    const playChord = () => {
      const t = this.now();
      const notes = chords[idx % chords.length];
      idx++;
      notes.forEach((f) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.5, t + 2.4);
        g.gain.linearRampToValueAtTime(0, t + 7.4);
        o.connect(g).connect(this.bgmGain);
        o.start(t); o.stop(t + 7.6);
      });
    };
    playChord();
    this.bgmTimer = setInterval(playChord, 6800);
  }
}
