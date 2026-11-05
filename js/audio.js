/* Tiny procedural audio engine — no external audio files. */

const WORLD_ROOTS = {
  forest: [174.61, 261.63],
  frozen: [196.0, 293.66],
  city: [146.83, 220.0],
  floating: [164.81, 246.94],
  cosmic: [130.81, 196.0],
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.noiseBuffer = null;
    this.ambient = null;
    this.world = 'forest';
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.7;
    this.master.connect(this.ctx.destination);

    const length = Math.floor(this.ctx.sampleRate * 1.4);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = 0.97 * last + 0.03 * white;
      data[i] = white * 0.6 + last * 1.6;
    }
    this.noiseBuffer = buffer;
    this.startAmbient();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.04);
    }
  }

  setWorld(world) {
    this.world = world;
    if (!this.ambient || !this.ctx) return;
    const [root, fifth] = WORLD_ROOTS[world] || WORLD_ROOTS.forest;
    const now = this.ctx.currentTime;
    this.ambient.oscA.frequency.setTargetAtTime(root, now, 0.7);
    this.ambient.oscB.frequency.setTargetAtTime(fifth, now, 0.7);
    this.ambient.oscC.frequency.setTargetAtTime(root * 2.003, now, 0.9);
  }

  startAmbient() {
    if (!this.ctx || this.ambient) return;
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.028;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 780;
    filter.Q.value = 0.4;
    gain.connect(filter);
    filter.connect(this.master);

    const [root, fifth] = WORLD_ROOTS[this.world] || WORLD_ROOTS.forest;
    const make = (freq, detune, type = 'sine') => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(gain);
      osc.start();
      return osc;
    };
    const oscA = make(root, -4);
    const oscB = make(fifth, 3);
    const oscC = make(root * 2.003, 7, 'triangle');

    // a very slow breathing LFO on the pad
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.01;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();

    // paper breeze
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 1200;
    nf.Q.value = 0.5;
    const ng = ctx.createGain();
    ng.gain.value = 0.007;
    noise.connect(nf);
    nf.connect(ng);
    ng.connect(this.master);
    noise.start();

    this.ambient = { gain, oscA, oscB, oscC, lfo, noise };
  }

  now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  tone(freq, duration, { type = 'sine', gain = 0.08, attack = 0.006, delay = 0, glide = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = this.now() + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30, freq), t);
    if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, glide), t + duration);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.03);
  }

  noise(duration, { gain = 0.05, freq = 1400, q = 0.8, type = 'bandpass', delay = 0, sweep = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = this.now() + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (sweep) filter.frequency.exponentialRampToValueAtTime(Math.max(80, sweep), t + duration);
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + duration + 0.04);
  }

  click() {
    this.tone(560, 0.055, { type: 'triangle', gain: 0.035, glide: 420 });
    this.noise(0.04, { gain: 0.02, freq: 2600, q: 1.4 });
  }

  step() {
    this.tone(150 + Math.random() * 20, 0.07, { type: 'sine', gain: 0.025, glide: 105 });
    this.noise(0.045, { gain: 0.022, freq: 900 + Math.random() * 300, q: 0.7 });
  }

  foldStart() {
    this.noise(0.34, { gain: 0.055, freq: 420, q: 1.1, sweep: 2600 });
    this.tone(120, 0.16, { type: 'triangle', gain: 0.035, glide: 80 });
  }

  foldComplete() {
    this.noise(0.16, { gain: 0.07, freq: 2100, q: 1.1, sweep: 280 });
    this.tone(92, 0.2, { type: 'sine', gain: 0.06, glide: 55 });
    this.tone(660, 0.1, { type: 'triangle', gain: 0.018, delay: 0.04 });
  }

  crease() {
    this.noise(0.1, { gain: 0.024, freq: 3200, q: 1.5, sweep: 1700 });
  }

  star() {
    const notes = [659.25, 783.99, 987.77];
    notes.forEach((note, i) => this.tone(note, 0.55, { type: 'triangle', gain: 0.055, delay: i * 0.07 }));
    this.tone(1318.5, 0.7, { type: 'sine', gain: 0.025, delay: 0.18 });
    this.noise(0.2, { gain: 0.018, freq: 5200, q: 1.5, delay: 0.04 });
  }

  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((note, i) => this.tone(note, 1.2, { type: 'triangle', gain: 0.06, delay: i * 0.105 }));
    this.tone(261.63, 1.4, { type: 'sine', gain: 0.05, delay: 0.04 });
    this.noise(0.7, { gain: 0.018, freq: 3600, q: 0.8, sweep: 1200, delay: 0.1 });
  }

  error() {
    this.tone(140, 0.16, { type: 'square', gain: 0.03, glide: 92 });
    this.noise(0.08, { gain: 0.02, freq: 500, q: 0.9 });
  }

  caught() {
    this.tone(220, 0.35, { type: 'sawtooth', gain: 0.035, glide: 70 });
    this.noise(0.35, { gain: 0.04, freq: 700, q: 0.7, sweep: 140 });
  }

  unlock() {
    [523.25, 659.25, 783.99, 1046.5].forEach((note, i) => {
      this.tone(note, 0.6, { type: 'triangle', gain: 0.045, delay: i * 0.075 });
    });
  }

  whoosh() {
    this.noise(0.5, { gain: 0.03, freq: 280, q: 0.8, sweep: 1800 });
  }
}
