// Tiny synthesized cues: a soft rising tick for hits (pitch climbs a little with the streak)
// and a quiet low thud for misses. No audio files, and short enough not to grate over a run.
let context = null;
let streak = 0;

const MAX_STREAK_STEPS = 8;

function audio() {
  if (!context) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
  }
  return context;
}

// Browsers only allow audio after a user gesture; call this from the Start click.
export function unlockAudio() {
  const ctx = audio();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function blip(ctx, { type, from, to, duration, gain }) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, now);
  osc.frequency.exponentialRampToValueAtTime(to, now + duration);
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + 0.005);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(amp).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

// Hits and misses have their own levels, so the miss thud can be turned down or off on its own.
export function playShot(hit, hitVolume, missVolume) {
  streak = hit ? streak + 1 : 0;
  const ctx = audio();
  const volume = hit ? hitVolume : missVolume;
  if (!ctx || volume <= 0 || ctx.state !== 'running') return;

  if (hit) {
    const base = 740 * 2 ** (Math.min(streak - 1, MAX_STREAK_STEPS) / 24);
    blip(ctx, { type: 'sine', from: base, to: base * 1.5, duration: 0.08, gain: 0.18 * volume });
  } else {
    blip(ctx, { type: 'triangle', from: 190, to: 110, duration: 0.07, gain: 0.08 * volume });
  }
}

// Countdown: a short tick for 3, 2, 1 and a brighter one on go.
export function playCountdown(go, volume) {
  const ctx = audio();
  if (!ctx || volume <= 0 || ctx.state !== 'running') return;
  const pitch = go ? 1046 : 523;
  blip(ctx, { type: 'square', from: pitch, to: pitch, duration: go ? 0.16 : 0.09, gain: 0.05 * volume });
}

export function resetStreak() {
  streak = 0;
}
