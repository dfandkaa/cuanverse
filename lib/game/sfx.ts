class SoundEffects {
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isMuted = localStorage.getItem('cuanverse_muted') === 'true';
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cuanverse_muted', String(this.isMuted));
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, gainValue = 0.1) {
    if (this.isMuted || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainValue, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Browser audio context policy fallback
    }
  }

  public coin() {
    this.playTone(987.77, 'square', 0.12, 0.15); // Note B5
  }

  public levelUp() {
    this.playTone(523.25, 'triangle', 0.1, 0.15); // C5
    setTimeout(() => this.playTone(659.25, 'triangle', 0.1, 0.15), 100); // E5
    setTimeout(() => this.playTone(783.99, 'triangle', 0.15, 0.15), 200); // G5
    setTimeout(() => this.playTone(1046.5, 'triangle', 0.3, 0.2), 300); // C6
  }

  public select() {
    this.playTone(440, 'sine', 0.08, 0.1);
  }

  public open() {
    this.playTone(329.63, 'square', 0.08, 0.1);
  }

  public tap() {
    this.playTone(600, 'sine', 0.05, 0.08);
  }
}

export const sfx = new SoundEffects();