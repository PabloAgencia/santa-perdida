// Todo el sonido se sintetiza en el navegador: ni un fichero de audio.
// El navegador no deja arrancar el sonido sin que el jugador toque algo,
// asi que start() se llama con la primera tecla o el primer clic.

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

class GameAudio {
  constructor() {
    this.ctx = null;
    this.started = false;
    this.muted = false;
    this.volume = 0.5;
  }

  start() {
    if (this.started) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;

    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.ctx.destination);

    this.noise = this._makeNoise();
    this._buildEngine();
    this._buildSkid();
    this.started = true;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.started) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
    return this.muted;
  }

  _makeNoise() {
    const len = Math.floor(this.ctx.sampleRate * 1.5);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  _buildEngine() {
    const ctx = this.ctx;
    this.engGain = ctx.createGain();
    this.engGain.gain.value = 0;

    this.engFilter = ctx.createBiquadFilter();
    this.engFilter.type = 'lowpass';
    this.engFilter.frequency.value = 420;
    this.engFilter.Q.value = 3;

    this.osc1 = ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.value = 50;

    this.osc2 = ctx.createOscillator();
    this.osc2.type = 'square';
    this.osc2.frequency.value = 25;

    const sub = ctx.createGain();
    sub.gain.value = 0.5;
    this.osc2.connect(sub);

    this.osc1.connect(this.engFilter);
    sub.connect(this.engFilter);
    this.engFilter.connect(this.engGain);
    this.engGain.connect(this.master);

    this.osc1.start();
    this.osc2.start();
  }

  _buildSkid() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;

    this.skidFilter = ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.value = 1900;
    this.skidFilter.Q.value = 1.4;

    this.skidGain = ctx.createGain();
    this.skidGain.gain.value = 0;

    src.connect(this.skidFilter);
    this.skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.master);
    src.start();
  }

  engine(on, ratio, throttle) {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    const r = clamp(ratio, 0, 1);
    const level = on ? 0.05 + r * 0.06 + (throttle ? 0.025 : 0) : 0;
    this.engGain.gain.setTargetAtTime(level, t, 0.08);
    const base = 46 + r * 155;
    this.osc1.frequency.setTargetAtTime(base, t, 0.05);
    this.osc2.frequency.setTargetAtTime(base * 0.5, t, 0.05);
    this.engFilter.frequency.setTargetAtTime(360 + r * 2300, t, 0.09);
  }

  skid(amount) {
    if (!this.started) return;
    const a = clamp(amount, 0, 1);
    this.skidGain.gain.setTargetAtTime(a * 0.12, this.ctx.currentTime, 0.05);
    this.skidFilter.frequency.setTargetAtTime(1500 + a * 900, this.ctx.currentTime, 0.08);
  }

  crash(intensity) {
    if (!this.started) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const a = clamp(intensity, 0.15, 1);

    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(60 + 120 * a, t);
    thump.frequency.exponentialRampToValueAtTime(38, t + 0.28);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.45 * a, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    thump.connect(tg);
    tg.connect(this.master);
    thump.start(t);
    thump.stop(t + 0.32);

    const metal = ctx.createBufferSource();
    metal.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1100 + 900 * a;
    bp.Q.value = 0.9;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(0.3 * a, t);
    mg.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    metal.connect(bp);
    bp.connect(mg);
    mg.connect(this.master);
    metal.start(t);
    metal.stop(t + 0.26);
  }

  notes(freqs, step = 0.09, type = 'triangle', gain = 0.16) {
    if (!this.started) return;
    const ctx = this.ctx;
    freqs.forEach((f, i) => {
      const t = ctx.currentTime + i * step;
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + step + 0.16);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t);
      osc.stop(t + step + 0.2);
    });
  }

  pickup() { this.notes([523.25, 659.25], 0.07); }
  delivered() { this.notes([523.25, 659.25, 783.99], 0.085); }
  newJob() { this.notes([392, 523.25], 0.1); }
}

export const Audio = new GameAudio();
