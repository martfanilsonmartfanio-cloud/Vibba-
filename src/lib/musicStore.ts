import { MusicTrackInfo } from '../types/vibba';

export const GLOBAL_MUSIC_STORE_TRACKS: MusicTrackInfo[] = [
  {
    id: 'vibba-afrobeat-luanda',
    title: 'Brisa da Marginal',
    artist: 'Vibba Studio',
    genre: 'Afro-Beat',
    bpm: 104,
    durationSec: 12,
    mood: 'Vibrante',
    license: 'Vibba CC0 · Uso Autorizado',
    accentColor: '#1877F2',
  },
  {
    id: 'vibba-kuduro-rua',
    title: 'Batida Kuduro Talatona',
    artist: 'Vibba Studio',
    genre: 'Kuduro',
    bpm: 132,
    durationSec: 10,
    mood: 'Energia',
    license: 'Vibba CC0 · Uso Autorizado',
    accentColor: '#F3425F',
  },
  {
    id: 'vibba-trap-freestyle',
    title: 'Freestyle 808 Luanda',
    artist: 'Vibba Beats',
    genre: 'Trap / Rap',
    bpm: 120,
    durationSec: 12,
    mood: 'Freestyle',
    license: 'Vibba CC0 · Uso Autorizado',
    accentColor: '#7C3AED',
  },
  {
    id: 'vibba-kizomba-noite',
    title: 'Noite Suave (Kizomba)',
    artist: 'Vibba Studio',
    genre: 'Kizomba',
    bpm: 92,
    durationSec: 12,
    mood: 'Romântico',
    license: 'Vibba CC0 · Uso Autorizado',
    accentColor: '#EC4899',
  },
  {
    id: 'vibba-semba-raiz',
    title: 'Alegria do Semba',
    artist: 'Vibba Studio',
    genre: 'Semba',
    bpm: 112,
    durationSec: 12,
    mood: 'Alegre',
    license: 'Vibba CC0 · Uso Autorizado',
    accentColor: '#F7B928',
  },
  {
    id: 'vibba-amapiano-sul',
    title: 'Log-Drum Groove',
    artist: 'Vibba Beats',
    genre: 'Amapiano',
    bpm: 114,
    durationSec: 12,
    mood: 'Groove',
    license: 'Vibba CC0 · Uso Autorizado',
    accentColor: '#10B981',
  },
  {
    id: 'vibba-lofi-desabafo',
    title: 'Rádio de Bairro Lo-Fi',
    artist: 'Vibba Studio',
    genre: 'Lo-Fi Chill',
    bpm: 84,
    durationSec: 14,
    mood: 'Calmo',
    license: 'Vibba CC0 · Uso Autorizado',
    accentColor: '#06B6D4',
  },
  {
    id: 'vibba-gospel-luz',
    title: 'Amanhecer Acústico',
    artist: 'Vibba Studio',
    genre: 'Acústico',
    bpm: 88,
    durationSec: 14,
    mood: 'Inspirador',
    license: 'Vibba CC0 · Uso Autorizado',
    accentColor: '#F59E0B',
  },
];

interface SynthPreset {
  bpm: number;
  durationSec: number;
  rootMidi: number;
  chords: number[][];
  bassPattern: number[];
  kickSteps: number[];
  snareSteps: number[];
  hatSteps: number[];
  arpPattern: number[];
  warmth: number;
}

const SYNTH_PRESETS: Record<string, SynthPreset> = {
  'vibba-afrobeat-luanda': {
    bpm: 104,
    durationSec: 12,
    rootMidi: 48,
    chords: [
      [60, 64, 67, 71],
      [57, 60, 64, 67],
      [53, 57, 60, 64],
      [55, 59, 62, 67],
    ],
    bassPattern: [0, -1, 0, 7, -1, 5, -1, 7],
    kickSteps: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    snareSteps: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0],
    hatSteps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    arpPattern: [0, 2, 1, 3, 2, 1, 3, 0],
    warmth: 0.7,
  },
  'vibba-kuduro-rua': {
    bpm: 132,
    durationSec: 10,
    rootMidi: 45,
    chords: [
      [57, 60, 64],
      [57, 62, 65],
      [55, 59, 64],
      [57, 60, 64],
    ],
    bassPattern: [0, 0, 12, 0, 7, 0, 10, 7],
    kickSteps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
    snareSteps: [0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0],
    hatSteps: [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1],
    arpPattern: [0, 2, 0, 1, 2, 1, 0, 2],
    warmth: 0.45,
  },
  'vibba-trap-freestyle': {
    bpm: 120,
    durationSec: 12,
    rootMidi: 40,
    chords: [
      [52, 55, 59],
      [48, 52, 55],
      [50, 53, 57],
      [47, 52, 55],
    ],
    bassPattern: [0, -1, -1, 0, -1, 3, 7, -1],
    kickSteps: [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0],
    snareSteps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hatSteps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    arpPattern: [0, 1, 2, 1, 0, 2, 1, 2],
    warmth: 0.65,
  },
  'vibba-kizomba-noite': {
    bpm: 92,
    durationSec: 12,
    rootMidi: 46,
    chords: [
      [58, 62, 65, 69],
      [55, 58, 62, 65],
      [51, 55, 58, 62],
      [53, 57, 60, 65],
    ],
    bassPattern: [0, -1, -1, 0, 7, -1, 5, -1],
    kickSteps: [1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0],
    snareSteps: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    hatSteps: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0],
    arpPattern: [0, 1, 2, 3, 2, 1, 3, 2],
    warmth: 0.85,
  },
  'vibba-semba-raiz': {
    bpm: 112,
    durationSec: 12,
    rootMidi: 50,
    chords: [
      [62, 66, 69, 74],
      [67, 71, 74, 79],
      [69, 73, 76, 81],
      [62, 66, 69, 74],
    ],
    bassPattern: [0, 4, 7, 4, 0, 7, 12, 7],
    kickSteps: [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0],
    snareSteps: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0],
    hatSteps: [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1],
    arpPattern: [0, 1, 2, 3, 1, 2, 3, 0],
    warmth: 0.72,
  },
  'vibba-amapiano-sul': {
    bpm: 114,
    durationSec: 12,
    rootMidi: 43,
    chords: [
      [55, 58, 62, 65],
      [53, 57, 60, 64],
      [51, 55, 58, 62],
      [53, 57, 60, 65],
    ],
    bassPattern: [0, -1, 0, 7, -1, 12, 7, 5],
    kickSteps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snareSteps: [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0],
    hatSteps: [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1],
    arpPattern: [0, 2, 3, 1, 2, 3, 0, 1],
    warmth: 0.78,
  },
  'vibba-lofi-desabafo': {
    bpm: 84,
    durationSec: 14,
    rootMidi: 48,
    chords: [
      [60, 64, 67, 71],
      [57, 60, 64, 67],
      [53, 57, 60, 64],
      [55, 59, 62, 65],
    ],
    bassPattern: [0, -1, -1, -1, 7, -1, -1, 5],
    kickSteps: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    snareSteps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hatSteps: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    arpPattern: [0, 1, 3, 2, 1, 3, 2, 0],
    warmth: 0.92,
  },
  'vibba-gospel-luz': {
    bpm: 88,
    durationSec: 14,
    rootMidi: 48,
    chords: [
      [60, 64, 67, 72],
      [55, 59, 62, 67],
      [57, 60, 64, 69],
      [53, 57, 60, 65],
    ],
    bassPattern: [0, -1, 7, -1, 0, -1, 5, 7],
    kickSteps: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    snareSteps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hatSteps: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    arpPattern: [0, 1, 2, 3, 2, 1, 0, 2],
    warmth: 0.9,
  },
};

const cachedTrackUrls = new Map<string, string>();

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i += 1) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export function getMusicTrackAudioUrl(trackId: string): string {
  const existing = cachedTrackUrls.get(trackId);
  if (existing) return existing;

  const preset =
    SYNTH_PRESETS[trackId] || SYNTH_PRESETS['vibba-afrobeat-luanda'];
  const sampleRate = 22050;
  const totalSamples = Math.floor(sampleRate * preset.durationSec);
  const samples = new Float32Array(totalSamples);

  const stepSec = 60 / preset.bpm / 4; // 16th note
  const stepSamples = Math.max(1, Math.floor(stepSec * sampleRate));
  const totalSteps = Math.ceil(totalSamples / stepSamples);

  // Deterministic pseudo-random generator for clean percussion transients
  let seed = 1337;
  for (let i = 0; i < trackId.length; i += 1) {
    seed = (seed * 33 + trackId.charCodeAt(i)) >>> 0;
  }
  const nextNoise = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 0xffffffff) * 2 - 1;
  };

  for (let step = 0; step < totalSteps; step += 1) {
    const startIdx = step * stepSamples;
    const stepInBar = step % 16;
    const barIdx = Math.floor(step / 16) % preset.chords.length;
    const chord = preset.chords[barIdx];

    // 1. Kick drum
    if (preset.kickSteps[stepInBar]) {
      const len = Math.min(Math.floor(0.24 * sampleRate), totalSamples - startIdx);
      let phase = 0;
      for (let i = 0; i < len; i += 1) {
        const t = i / sampleRate;
        const freq = 46 + 98 * Math.exp(-t * 28);
        phase += (2 * Math.PI * freq) / sampleRate;
        const env = Math.exp(-t * 14);
        samples[startIdx + i] += Math.sin(phase) * env * 0.48;
      }
    }

    // 2. Snare / Clap
    if (preset.snareSteps[stepInBar]) {
      const len = Math.min(Math.floor(0.16 * sampleRate), totalSamples - startIdx);
      for (let i = 0; i < len; i += 1) {
        const t = i / sampleRate;
        const body = Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 26);
        const snap = nextNoise() * Math.exp(-t * 22);
        samples[startIdx + i] += (body * 0.16 + snap * 0.18);
      }
    }

    // 3. Hi-hat
    if (preset.hatSteps[stepInBar]) {
      const len = Math.min(Math.floor(0.055 * sampleRate), totalSamples - startIdx);
      for (let i = 0; i < len; i += 1) {
        const t = i / sampleRate;
        const hp = nextNoise() - nextNoise() * 0.5;
        samples[startIdx + i] += hp * Math.exp(-t * 68) * 0.08;
      }
    }

    // 4. Bass / Log-drum
    const bassStep = preset.bassPattern[Math.floor(stepInBar / 2) % preset.bassPattern.length];
    if (step % 2 === 0 && bassStep >= 0) {
      const midi = preset.rootMidi + bassStep;
      const hz = midiToHz(midi);
      const len = Math.min(Math.floor(stepSec * 1.9 * sampleRate), totalSamples - startIdx);
      for (let i = 0; i < len; i += 1) {
        const t = i / sampleRate;
        const env = Math.min(1, t / 0.008) * Math.exp(-t * 4.2);
        const wave =
          Math.sin(2 * Math.PI * hz * t) * 0.8 +
          Math.sin(2 * Math.PI * hz * 2 * t) * 0.2;
        samples[startIdx + i] += wave * env * 0.28;
      }
    }

    // 5. Warm Rhodes chord pad on beat 1 & 9 of bar
    if (stepInBar === 0 || stepInBar === 8) {
      const len = Math.min(Math.floor(stepSec * 7.8 * sampleRate), totalSamples - startIdx);
      for (let i = 0; i < len; i += 1) {
        const t = i / sampleRate;
        const env = Math.min(1, t / 0.03) * Math.exp(-t * 1.45);
        let sum = 0;
        for (let c = 0; c < chord.length; c += 1) {
          const hz = midiToHz(chord[c]);
          sum +=
            Math.sin(2 * Math.PI * hz * t) +
            (1 - preset.warmth * 0.5) * 0.22 * Math.sin(2 * Math.PI * hz * 2 * t);
        }
        samples[startIdx + i] += (sum / chord.length) * env * 0.22;
      }
    }

    // 6. Plucked melody arpeggio every 2 steps
    if (step % 2 === 0) {
      const arpIdx =
        preset.arpPattern[Math.floor(stepInBar / 2) % preset.arpPattern.length] %
        chord.length;
      const hz = midiToHz(chord[arpIdx] + 12);
      const len = Math.min(Math.floor(stepSec * 1.8 * sampleRate), totalSamples - startIdx);
      for (let i = 0; i < len; i += 1) {
        const t = i / sampleRate;
        const env = Math.min(1, t / 0.006) * Math.exp(-t * 7.5);
        const pluck =
          Math.sin(2 * Math.PI * hz * t) * 0.8 +
          Math.sin(2 * Math.PI * hz * 2 * t) * (1 - preset.warmth) * 0.35;
        samples[startIdx + i] += pluck * env * 0.14;
      }
    }
  }

  // Smooth loop fade-in / fade-out (25ms) & soft limiter
  const fadeSamples = Math.floor(0.025 * sampleRate);
  const buffer = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, totalSamples * 2, true);

  for (let i = 0; i < totalSamples; i += 1) {
    let sample = samples[i];
    if (i < fadeSamples) sample *= i / fadeSamples;
    if (i > totalSamples - fadeSamples) sample *= (totalSamples - i) / fadeSamples;
    const limited = Math.tanh(sample * 1.15);
    view.setInt16(44 + i * 2, Math.max(-32767, Math.min(32767, Math.round(limited * 32767))), true);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  const objectUrl = URL.createObjectURL(blob);
  cachedTrackUrls.set(trackId, objectUrl);
  return objectUrl;
}
