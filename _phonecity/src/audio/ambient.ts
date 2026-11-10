/**
 * 옥상 배경음: 외부 음원 없이 Web Audio로 만든 잔잔한 패드 화음.
 * 사용자의 동작(옥상 문 열기) 이후에만 시작하며 켜기/끄기를 제공한다.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer = 0;

const CHORDS = [
  [196.0, 246.94, 293.66, 392.0], // G
  [174.61, 220.0, 261.63, 349.23], // F
  [164.81, 196.0, 246.94, 329.63], // Em
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
];

function playChord(i: number) {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  for (const f of CHORDS[i % CHORDS.length]) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    o.detune.value = (Math.random() - 0.5) * 8;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.18, now + 2.5);
    g.gain.linearRampToValueAtTime(0, now + 7.5);
    o.connect(g).connect(master);
    o.start(now);
    o.stop(now + 7.6);
  }
}

export function startAmbient() {
  if (ctx) return;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1400;
  master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 3);
  master.connect(lp).connect(ctx.destination);
  let i = 0;
  playChord(i++);
  timer = window.setInterval(() => playChord(i++), 6000);
}

export function stopAmbient() {
  if (!ctx || !master) return;
  const c = ctx;
  master.gain.linearRampToValueAtTime(0, c.currentTime + 1.2);
  clearInterval(timer);
  ctx = null; master = null;
  setTimeout(() => c.close(), 1400);
}
