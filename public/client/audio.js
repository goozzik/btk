export class Audio {
  constructor() {
    this.enabled = false;
    this.context = null;
    this.last = 0;
  }
  async enable() {
    this.context ||= new (window.AudioContext || window.webkitAudioContext)();
    await this.context.resume();
    this.enabled = true;
  }
  play(kind, own = false) {
    if (!this.enabled || !this.context || this.context.state !== "running")
      return;
    const now = this.context.currentTime;
    if (kind === "shot" && !own && now - this.last < 0.06) return;
    this.last = now;
    const osc = this.context.createOscillator(),
      gain = this.context.createGain();
    osc.connect(gain);
    gain.connect(this.context.destination);
    const values =
      kind === "shot"
        ? [330, 90, 0.07, "triangle"]
        : kind === "hit"
          ? [720, 160, 0.09, "square"]
          : kind === "jump"
            ? [230, 520, 0.1, "sine"]
            : kind === "kill"
              ? [500, 70, 0.3, "sawtooth"]
              : [660, 990, 0.22, "sine"];
    osc.type = values[3];
    osc.frequency.setValueAtTime(values[0], now);
    osc.frequency.exponentialRampToValueAtTime(values[1], now + values[2]);
    gain.gain.setValueAtTime(own ? 0.055 : 0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + values[2]);
    osc.start(now);
    osc.stop(now + values[2]);
  }
}
