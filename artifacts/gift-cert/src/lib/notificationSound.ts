const SOUND_KEY_PREFIX = "gc_sound_";
const SOUND_TYPE_KEY_PREFIX = "gc_sound_type_";

export type SoundType = "ding" | "dingdong" | "pop" | "chime" | "alert";

export interface SoundOption {
  id: SoundType;
  label: string;
  emoji: string;
}

export const SOUND_OPTIONS: SoundOption[] = [
  { id: "ding",     label: "딩",    emoji: "🔔" },
  { id: "dingdong", label: "딩동",  emoji: "🛎️" },
  { id: "pop",      label: "톡",    emoji: "💬" },
  { id: "chime",    label: "차임",  emoji: "🎵" },
  { id: "alert",    label: "경보",  emoji: "🚨" },
];

export function getSoundEnabled(role: "customer" | "admin" | "staff"): boolean {
  const val = localStorage.getItem(SOUND_KEY_PREFIX + role);
  return val === null ? true : val === "true";
}

export function setSoundEnabled(role: "customer" | "admin" | "staff", enabled: boolean) {
  localStorage.setItem(SOUND_KEY_PREFIX + role, String(enabled));
}

export function getSoundType(role: "customer" | "admin" | "staff"): SoundType {
  return (localStorage.getItem(SOUND_TYPE_KEY_PREFIX + role) as SoundType) || "ding";
}

export function setSoundType(role: "customer" | "admin" | "staff", type: SoundType) {
  localStorage.setItem(SOUND_TYPE_KEY_PREFIX + role, type);
}

function createCtx() {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
}

function playDing() {
  const ctx = createCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.start(); osc.stop(ctx.currentTime + 0.5);
  osc.onended = () => ctx.close();
}

function playDingDong() {
  const ctx = createCtx();
  [
    { freq: 784, start: 0,    dur: 0.35 },
    { freq: 523, start: 0.35, dur: 0.45 },
  ].forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
    gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + dur);
    osc.onended = () => ctx.close();
  });
}

function playPop() {
  const ctx = createCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(1200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.start(); osc.stop(ctx.currentTime + 0.12);
  osc.onended = () => ctx.close();
}

function playChime() {
  const ctx = createCtx();
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine";
    const t = ctx.currentTime + i * 0.18;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.start(t); osc.stop(t + 0.5);
    osc.onended = () => ctx.close();
  });
}

function playAlert() {
  const ctx = createCtx();
  [0, 0.22, 0.44].forEach((offset) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(880, ctx.currentTime + offset);
    gain.gain.setValueAtTime(0.18, ctx.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.18);
    osc.start(ctx.currentTime + offset);
    osc.stop(ctx.currentTime + offset + 0.18);
    osc.onended = () => ctx.close();
  });
}

export function playSound(type: SoundType) {
  try {
    switch (type) {
      case "ding":     playDing(); break;
      case "dingdong": playDingDong(); break;
      case "pop":      playPop(); break;
      case "chime":    playChime(); break;
      case "alert":    playAlert(); break;
    }
  } catch { /* 무시 */ }
}

export function playNotificationSound(role?: "customer" | "admin" | "staff") {
  try {
    const type = role ? getSoundType(role) : "ding";
    playSound(type);
  } catch { /* 무시 */ }
}
