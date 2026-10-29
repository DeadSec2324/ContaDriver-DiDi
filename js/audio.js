// js/audio.js - Sonidos sintéticos con Web Audio API y Vibración Háptica
class FeedbackService {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  initContext() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  vibrate(ms = 60) {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch (e) {}
    }
  }

  // Sonido de cobro exitoso (estilo moneda/caja registradora)
  playCashSuccess() {
    const settings = window.storageService ? window.storageService.getSettings() : { soundEnabled: true, vibrateEnabled: true };
    if (settings.vibrateEnabled) this.vibrate([40, 30, 60]);
    if (!settings.soundEnabled) return;

    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      // Primera nota alta
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, now); // B5
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Segunda nota campana
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1318.51, now + 0.08); // E6
      gain2.gain.setValueAtTime(0.2, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.35);
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  }

  // Sonido de gasto registrado
  playExpenseSound() {
    const settings = window.storageService ? window.storageService.getSettings() : { soundEnabled: true, vibrateEnabled: true };
    if (settings.vibrateEnabled) this.vibrate(50);
    if (!settings.soundEnabled) return;

    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(392.00, now + 0.18); // G4
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  }

  // Sonido de tap o botón rápido
  playClick() {
    const settings = window.storageService ? window.storageService.getSettings() : { soundEnabled: true };
    if (!settings.soundEnabled) return;

    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }
}

window.feedbackService = new FeedbackService();
