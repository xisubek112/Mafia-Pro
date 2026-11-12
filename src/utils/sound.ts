let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  return audioCtx;
}

export type SoundCue =
  | 'click'
  | 'night'
  | 'day'
  | 'voting'
  | 'countdown'
  | 'tick'
  | 'vote_cast'
  | 'elimination'
  | 'victory'
  | 'wind'
  | 'thunder'
  | 'sunrise_ambience';

export interface SoundOptions {
  enabled: boolean;
  uiVolume?: number; // 0..1
  ambientVolume?: number; // 0..1
  rainEnabled?: boolean;
}

let activeAmbientStop: (() => void) | null = null;
let activeAmbientKey: string | null = null;

export function stopAmbientLoop() {
  if (activeAmbientStop) {
    try {
      activeAmbientStop();
    } catch {
      // ignore cleanup errors
    }
    activeAmbientStop = null;
    activeAmbientKey = null;
  }
}

export function startAmbientLoop(
  phase: 'NIGHT' | 'DAY' | 'VOTING' | 'NONE',
  opts: SoundOptions
) {
  if (!opts.enabled || phase === 'NONE' || (opts.ambientVolume ?? 0.5) <= 0.01) {
    stopAmbientLoop();
    return;
  }

  const ambVol = opts.ambientVolume ?? 0.5;
  const key = `${phase}:${Boolean(opts.rainEnabled)}:${Math.round(ambVol * 20)}`;
  if (activeAmbientKey === key) return;

  stopAmbientLoop();

  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  if (ctx.state === 'suspended') return;

  try {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.12 * ambVol, ctx.currentTime + 1.2);
    master.connect(ctx.destination);

    const stopCallbacks: Array<() => void> = [];

    // Filtered noise layer for night wind / rain or soft day breeze
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = phase === 'NIGHT' && opts.rainEnabled ? 'bandpass' : 'lowpass';
    filter.frequency.value = phase === 'NIGHT' ? (opts.rainEnabled ? 950 : 280) : phase === 'VOTING' ? 220 : 420;
    filter.Q.value = phase === 'NIGHT' && opts.rainEnabled ? 0.9 : 0.7;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = phase === 'NIGHT' ? (opts.rainEnabled ? 0.35 : 0.24) : 0.12;

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();
    stopCallbacks.push(() => {
      try {
        noise.stop();
      } catch {
        // ignore
      }
    });

    // Subtle tonal drone matching the phase atmosphere
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = phase === 'DAY' ? 'sine' : 'triangle';
    osc.frequency.value = phase === 'NIGHT' ? 65.41 : phase === 'VOTING' ? 82.41 : 130.81;
    oscGain.gain.value = phase === 'VOTING' ? 0.18 : 0.14;
    osc.connect(oscGain);
    oscGain.connect(master);
    osc.start();
    stopCallbacks.push(() => {
      try {
        osc.stop();
      } catch {
        // ignore
      }
    });

    activeAmbientKey = key;
    activeAmbientStop = () => {
      try {
        master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      } catch {
        // ignore
      }
      setTimeout(() => {
        for (const fn of stopCallbacks) fn();
        try {
          master.disconnect();
        } catch {
          // ignore
        }
      }, 380);
    };
  } catch {
    // Ignore audio errors when blocked
  }
}

export function playTone(cue: SoundCue, opts: boolean | SoundOptions) {
  const enabled = typeof opts === 'boolean' ? opts : opts.enabled;
  if (!enabled) return;

  const uiVol = typeof opts === 'boolean' ? 0.6 : opts.uiVolume ?? 0.6;
  const ambVol = typeof opts === 'boolean' ? 0.5 : opts.ambientVolume ?? 0.5;
  const isAmbient =
    cue === 'night' ||
    cue === 'day' ||
    cue === 'voting' ||
    cue === 'wind' ||
    cue === 'thunder' ||
    cue === 'sunrise_ambience';
  const masterGain = isAmbient ? ambVol : uiVol;
  if (masterGain <= 0.01) return;

  const ctx = getCtx();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (ctx.state === 'suspended') return;

    const now = ctx.currentTime;

    const playNote = (
      freqStart: number,
      freqEnd: number,
      duration: number,
      type: OscillatorType,
      peak: number,
      delay = 0
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.connect(gain);
      gain.connect(ctx.destination);

      const t0 = now + delay;
      osc.frequency.setValueAtTime(freqStart, t0);
      if (freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + duration);
      }
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(peak * masterGain, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    };

    switch (cue) {
      case 'click':
        playNote(540, 480, 0.07, 'sine', 0.06);
        break;
      case 'tick':
        playNote(1180, 740, 0.035, 'triangle', 0.055);
        break;
      case 'vote_cast':
        playNote(320, 180, 0.09, 'triangle', 0.08);
        playNote(640, 480, 0.06, 'sine', 0.04, 0.03);
        break;
      case 'countdown':
        playNote(760, 720, 0.06, 'sine', 0.05);
        break;
      case 'night':
        playNote(196, 130.81, 0.65, 'triangle', 0.11);
        playNote(293.66, 220, 0.7, 'sine', 0.06, 0.08);
        break;
      case 'day':
        playNote(329.63, 440, 0.45, 'sine', 0.08);
        playNote(440, 554.37, 0.55, 'triangle', 0.07, 0.12);
        playNote(659.25, 659.25, 0.6, 'sine', 0.05, 0.24);
        break;
      case 'voting':
        playNote(164.81, 155.56, 0.35, 'sawtooth', 0.045);
        playNote(220, 207.65, 0.35, 'triangle', 0.06, 0.12);
        break;
      case 'elimination':
        playNote(130.81, 65.41, 0.55, 'sawtooth', 0.08);
        playNote(98, 55, 0.65, 'triangle', 0.1, 0.05);
        break;
      case 'victory':
        playNote(440, 440, 0.25, 'triangle', 0.09, 0);
        playNote(554.37, 554.37, 0.25, 'triangle', 0.09, 0.14);
        playNote(659.25, 659.25, 0.3, 'triangle', 0.1, 0.28);
        playNote(880, 880, 0.6, 'sine', 0.09, 0.42);
        break;
      case 'wind':
        playNote(110, 145, 1.4, 'sine', 0.04, 0);
        playNote(145, 95, 1.6, 'sine', 0.035, 0.7);
        break;
      case 'thunder':
        playNote(82, 36, 1.1, 'sawtooth', 0.06, 0.15);
        playNote(65, 32, 1.3, 'triangle', 0.08, 0.25);
        break;
      case 'sunrise_ambience':
        playNote(261.63, 329.63, 0.9, 'sine', 0.05, 0);
        playNote(392.0, 523.25, 1.1, 'sine', 0.045, 0.2);
        break;
    }
  } catch {
    // Ignore audio errors when blocked
  }
}
