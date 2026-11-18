// Neon Harbor — sound, synthesized live with WebAudio. No audio files, no network.
// One file, one job: engine hum, sirens, gunshots, pickups and a bassline.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenTimer = null;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    } catch (e) { this.ctx = null; }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.ctx && this.ctx.destination) {
      this.ctx.destination.gain = muted ? 0 : 1;
    }
  }

  // A short burst of filtered noise: gunshots, crashes, impacts.
  burst(freq, duration, volume) {
    if (!this.ctx || this.muted) return;
    try {
      const len = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start();
    } catch (e) { /* sound never breaks the game */ }
  }

  tone(freq, duration, volume, type = 'sine') {
    if (!this.ctx || this.muted) return;
    try {
      const osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) { /* sound never breaks the game */ }
  }

  shot() {
    this.burst(2400, 0.14, 0.5);
  }

  crash() {
    this.burst(500, 0.35, 0.7);
    this.tone(70, 0.3, 0.4, 'sawtooth');
  }

  pickup() {
    this.tone(660, 0.12, 0.3);
    setTimeout(() => this.tone(990, 0.18, 0.3), 90);
  }

  jingle() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => setTimeout(() => this.tone(n, 0.22, 0.28, 'triangle'), i * 110));
  }

  engine(on, speedRatio) {
    if (!this.ctx) return;
    try {
      if (on && !this.engineOsc) {
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0.03;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        this.engineOsc.connect(filter);
        filter.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);
        this.engineOsc.start();
      }
      if (this.engineOsc) {
        this.engineOsc.frequency.value = 60 + speedRatio * 140;
        if (this.engineGain) this.engineGain.gain.value = on ? 0.03 + speedRatio * 0.03 : 0;
      }
      if (!on && this.engineOsc) {
        this.engineOsc.stop();
        this.engineOsc = null;
        this.engineGain = null;
      }
    } catch (e) { /* sound never breaks the game */ }
  }

  siren(on) {
    if (!this.ctx) return;
    try {
      if (on && !this.sirenOsc) {
        this.sirenOsc = this.ctx.createOscillator();
        this.sirenOsc.type = 'sine';
        this.sirenOsc.frequency.value = 700;
        this.sirenGain = this.ctx.createGain();
        this.sirenGain.gain.value = 0.035;
        this.sirenOsc.connect(this.sirenGain);
        this.sirenGain.connect(this.ctx.destination);
        this.sirenOsc.start();
        let high = false;
        this.sirenTimer = setInterval(() => {
          if (!this.sirenOsc) return;
          high = !high;
          this.sirenOsc.frequency.value = high ? 950 : 700;
        }, 420);
      }
      if (!on && this.sirenOsc) {
        clearInterval(this.sirenTimer);
        this.sirenOsc.stop();
        this.sirenOsc = null;
        this.sirenGain = null;
      }
    } catch (e) { /* sound never breaks the game */ }
  }

  // A lazy two-bar bassline that keeps the city humming.
  music(on) {
    if (!this.ctx) return;
    if (on && !this.musicTimer) {
      const bass = [55, 55, 65.4, 49, 55, 55, 82.4, 73.4];
      this.musicTimer = setInterval(() => {
        if (this.muted) return;
        this.tone(bass[this.musicStep % bass.length], 0.42, 0.12, 'triangle');
        this.musicStep += 1;
      }, 460);
    }
    if (!on && this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
