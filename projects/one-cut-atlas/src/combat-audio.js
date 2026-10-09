const EFFECTS = ['s_start', 's_swing', 's_clash1', 's_clash2', 's_clash3', 's_dodge', 's_shove', 's_cut1', 's_cut2', 's_cut3', 's_kill'];
const effectUrl = name => new URL(`../assets/audio/combat/${name}.ogg`, import.meta.url);
const loopUrl = name => new URL(`../assets/audio/${name}.ogg`, import.meta.url);

/** Predecoded Web Audio playback: combat never performs a network fetch or OGG decode on impact. */
export class CombatAudio {
  constructor() {
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    this.context = AudioContext ? new AudioContext() : null;
    this.enabled = true;
    this.buffers = new Map();
    this.effectsLoading = null;
    this.loopsLoading = null;
    this.loopNodes = [];
    this.started = false;
  }

  async decode(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Audio unavailable: ${url.pathname}`);
    return this.context.decodeAudioData(await response.arrayBuffer());
  }

  preloadEffects() {
    if (!this.context) return Promise.resolve(false);
    this.effectsLoading ||= Promise.all(EFFECTS.map(async name => this.buffers.set(name, await this.decode(effectUrl(name))))).then(() => true);
    return this.effectsLoading;
  }

  preloadLoops() {
    if (!this.context) return Promise.resolve(false);
    this.loopsLoading ||= Promise.all(['music', 'ambience'].map(async name => this.buffers.set(name, await this.decode(loopUrl(name))))).then(() => true);
    return this.loopsLoading;
  }

  async start() {
    if (!this.context) return false;
    await this.context.resume();
    await this.preloadEffects();
    if (!this.enabled) return false;
    if (!this.started) {
      this.started = true;
      void this.preloadLoops().then(() => {
        if (!this.enabled || this.loopNodes.length) return;
        this.startLoops();
      }).catch(() => {});
    }
    return true;
  }

  loop(name, volume) {
    const buffer = this.buffers.get(name);
    if (!buffer || !this.context) return;
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = buffer; source.loop = true; gain.gain.value = volume;
    source.connect(gain); gain.connect(this.context.destination); source.start();
    this.loopNodes.push({ source, gain, volume });
  }

  startLoops() {
    if (this.loopNodes.length || !this.enabled) return;
    this.loop('music', .11);
    this.loop('ambience', .18);
  }

  play(name, volume = .5, rate = 1) {
    if (!this.enabled || this.context?.state !== 'running') return;
    const buffer = this.buffers.get(name);
    if (!buffer) return;
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = buffer; source.playbackRate.value = rate; gain.gain.value = volume;
    source.connect(gain); gain.connect(this.context.destination); source.start();
  }

  event(type) {
    const pick = prefix => `${prefix}${1 + Math.floor(Math.random() * 3)}`;
    if (type === 'begin') this.play('s_start', .34);
    else if (type === 'slash') this.play('s_swing', .44, .94 + Math.random() * .12);
    else if (type === 'parry' || type === 'clash') this.play(pick('s_clash'), .62);
    else if (type === 'evade') this.play('s_dodge', .36);
    else if (type === 'shove') this.play('s_shove', .48);
    else if (type === 'hit') {
      this.play(pick('s_cut'), .68, .96 + Math.random() * .08);
      this.play('s_kill', .44);
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.context) for (const { gain, volume } of this.loopNodes) gain.gain.setTargetAtTime(this.enabled ? volume : 0, this.context.currentTime, .05);
    if (this.enabled && this.loopsLoading) void this.loopsLoading.then(() => this.startLoops());
    return this.enabled;
  }
}
