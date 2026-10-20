// Tiny synthesized sound effects; no audio files needed.

let audio = null;

const SOUNDS = {
  pop: [[660, 990, .08, 'sine', .12]],
  hop: [[320, 640, .12, 'triangle', .1]],
  land: [[180, 90, .1, 'sine', .14]],
  thud: [[140, 50, .22, 'sawtooth', .1]],
  bump: [[220, 160, .06, 'square', .05]],
  grab: [[520, 780, .07, 'sine', .08]],
  kick: [[200, 420, .07, 'square', .06]],
  munch: [[300, 260, .05, 'square', .05], [280, 240, .05, 'square', .05, .12]],
  chime: [[880, 880, .18, 'sine', .1], [1320, 1320, .3, 'sine', .08, .14]]
};

export function play(name, enabled) {
  if (!enabled) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const now = audio.currentTime;
    for (const [from, to, length, type, volume, delay = 0] of SOUNDS[name] || []) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, now + delay);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + delay + length);
      gain.gain.setValueAtTime(volume, now + delay);
      gain.gain.exponentialRampToValueAtTime(.0001, now + delay + length);
      osc.connect(gain).connect(audio.destination);
      osc.start(now + delay);
      osc.stop(now + delay + length + .02);
    }
  } catch {
    // Audio is decoration only.
  }
}
