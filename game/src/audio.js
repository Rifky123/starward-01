// Every sound is synthesized here: no audio files, no network. The court's
// voice — deal, play, strike, spell, death, victory, defeat — as WebAudio
// oscillators with their own envelopes.

let ctx = null;
let enabled = true;

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { enabled = false; return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** One voiced blip: a wave, its glide, and how it fades. */
function blip({ freq = 440, glide = 0, dur = 0.12, type = 'triangle', vol = 0.16, delay = 0 }) {
  if (!enabled) return;
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + glide), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise({ dur = 0.18, vol = 0.12, delay = 0, low = 800 }) {
  if (!enabled) return;
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = low;
  const gain = a.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(a.destination);
  src.start(t0);
}

export const sfx = {
  deal() { blip({ freq: 300, glide: 220, dur: 0.09, vol: 0.09 }); noise({ dur: 0.07, vol: 0.05, low: 1600 }); },
  play() { blip({ freq: 220, glide: -80, dur: 0.16, type: 'square', vol: 0.12 }); noise({ dur: 0.1, vol: 0.06, low: 900 }); },
  strike() { noise({ dur: 0.14, vol: 0.2, low: 2200 }); blip({ freq: 160, glide: -90, dur: 0.12, type: 'sawtooth', vol: 0.14 }); },
  heroHit() { blip({ freq: 110, glide: -60, dur: 0.25, type: 'sawtooth', vol: 0.2 }); noise({ dur: 0.2, vol: 0.14, low: 600 }); },
  spell() { blip({ freq: 520, glide: 340, dur: 0.22, type: 'sine', vol: 0.15 }); blip({ freq: 780, glide: 220, dur: 0.18, vol: 0.1, delay: 0.06 }); },
  death() { blip({ freq: 240, glide: -180, dur: 0.3, type: 'triangle', vol: 0.12 }); },
  heal() { blip({ freq: 440, glide: 180, dur: 0.2, type: 'sine', vol: 0.12 }); },
  turn() { blip({ freq: 330, glide: 110, dur: 0.15, vol: 0.1 }); },
  victory() { [523, 659, 784, 1047].forEach((f, i) => blip({ freq: f, dur: 0.3, type: 'triangle', vol: 0.16, delay: i * 0.13 })); },
  defeat() { [330, 262, 196, 147].forEach((f, i) => blip({ freq: f, dur: 0.34, type: 'triangle', vol: 0.15, delay: i * 0.17 })); },
  toggle(value) { enabled = value; },
};
