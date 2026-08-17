/**
 * All five fields feed `exponentialRampToValueAtTime`, which throws for a
 * value <= 0 — keep every stage's frequencies and gain strictly positive
 * (the fixed 0.0001 gain floor in the player below is the ramp's target,
 * not one of these fields, precisely to respect that constraint).
 */
export interface ThemeToneStage {
  startFreq: number;
  endFreq: number;
  freqRampSeconds: number;
  gainStart: number;
  gainRampSeconds: number;
}

export interface ThemeToneConfig {
  waveform: OscillatorType;
  pin: ThemeToneStage;
  focus: ThemeToneStage;
  /** `osc.stop(now + stopSeconds)` — every quartet theme uses one fixed offset for both pin and focus. */
  stopSeconds: number;
  /** navigator.vibrate() duration in ms. Defaults to 10, matching Ocean/Cloud/Lavender (Classic uses 8). */
  vibrateMs?: number;
}

/**
 * Builds a theme's pin/focus chime player. Each quartet theme (Ocean/Cloud/
 * Lavender/Classic) previously carried a verbatim copy of this
 * cached-AudioContext + oscillator setup, differing only in the waveform and
 * the frequency/gain numbers passed here. The returned function is created
 * once at module scope per theme (not per render) so the underlying
 * AudioContext stays a page-lifetime singleton, exactly matching the prior
 * per-theme `cachedXAudioCtx` module variable.
 */
export function createThemeTonePlayer(
  config: ThemeToneConfig,
): (type?: "pin" | "focus") => void {
  let cachedCtx: AudioContext | null = null;

  const getAudioContext = (): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!cachedCtx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        cachedCtx = new AudioCtx();
      }
    }
    if (cachedCtx && cachedCtx.state === "suspended") {
      cachedCtx.resume().catch(() => {});
    }
    return cachedCtx;
  };

  return (type: "pin" | "focus" = "pin"): void => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = config.waveform;
      const now = ctx.currentTime;
      const stage = type === "pin" ? config.pin : config.focus;
      osc.frequency.setValueAtTime(stage.startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(
        stage.endFreq,
        now + stage.freqRampSeconds,
      );
      gain.gain.setValueAtTime(stage.gainStart, now);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + stage.gainRampSeconds,
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + config.stopSeconds);
    } catch {
      // Graceful fallback
    }
    try {
      navigator?.vibrate?.(config.vibrateMs ?? 10);
    } catch {
      // Ignore haptics fallback
    }
  };
}
