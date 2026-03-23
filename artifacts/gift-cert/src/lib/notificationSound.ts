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

// ── 설정 ───────────────────────────────────────────────────────────────────
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

// ── 무음 WAV 생성 (모바일 오디오 잠금 해제용) ──────────────────────────────
function makeSilentWav(): ArrayBuffer {
  const buf = new ArrayBuffer(46);
  const v = new DataView(buf);
  const s = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, "RIFF"); v.setUint32(4, 38, true); s(8, "WAVE");
  s(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, 8000, true);
  v.setUint32(28, 16000, true); v.setUint16(32, 2, true);
  v.setUint16(34, 16, true); s(36, "data"); v.setUint32(40, 2, true);
  return buf; // 마지막 2바이트는 0 (무음)
}
const _silentUrl = URL.createObjectURL(new Blob([makeSilentWav()], { type: "audio/wav" }));

// ── AudioBuffer → WAV 변환 ─────────────────────────────────────────────────
function audioBufferToWav(buf: AudioBuffer): ArrayBuffer {
  const d = buf.getChannelData(0);
  const n = d.length;
  const ab = new ArrayBuffer(44 + n * 2);
  const v = new DataView(ab);
  const s = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); s(8, "WAVE");
  s(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, buf.sampleRate, true);
  v.setUint32(28, buf.sampleRate * 2, true); v.setUint16(32, 2, true);
  v.setUint16(34, 16, true); s(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const x = Math.max(-1, Math.min(1, d[i]));
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7FFF, true);
  }
  return ab;
}

// ── OfflineAudioContext로 소리 렌더링 ──────────────────────────────────────
const SR = 22050;
const DURATIONS: Record<SoundType, number> = {
  ding: 0.65, dingdong: 0.75, pop: 0.2, chime: 1.1, alert: 0.68,
};

function buildSound(ctx: OfflineAudioContext, type: SoundType) {
  if (type === "ding") {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = "sine";
    o.frequency.setValueAtTime(880, 0); o.frequency.exponentialRampToValueAtTime(660, 0.15);
    g.gain.setValueAtTime(0.5, 0); g.gain.exponentialRampToValueAtTime(0.001, 0.55);
    o.start(0); o.stop(0.6);
  } else if (type === "dingdong") {
    [[784, 0, 0.35], [523, 0.35, 0.35]].forEach(([f, t, d]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination); o.type = "sine";
      o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d); o.start(t); o.stop(t + d);
    });
  } else if (type === "pop") {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = "sine";
    o.frequency.setValueAtTime(1200, 0); o.frequency.exponentialRampToValueAtTime(400, 0.08);
    g.gain.setValueAtTime(0.6, 0); g.gain.exponentialRampToValueAtTime(0.001, 0.14);
    o.start(0); o.stop(0.15);
  } else if (type === "chime") {
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination); o.type = "sine";
      const t = i * 0.18;
      o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5); o.start(t); o.stop(t + 0.5);
    });
  } else if (type === "alert") {
    [0, 0.22, 0.44].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination); o.type = "square";
      o.frequency.setValueAtTime(880, t); g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.start(t); o.stop(t + 0.18);
    });
  }
}

const _blobUrls = new Map<SoundType, string>();
const _renderP = new Map<SoundType, Promise<void>>();

function startRender(type: SoundType): Promise<void> {
  if (_renderP.has(type)) return _renderP.get(type)!;
  const p = (async () => {
    const oac = new OfflineAudioContext(1, Math.ceil(SR * DURATIONS[type]), SR);
    buildSound(oac, type);
    const buf = await oac.startRendering();
    const wav = audioBufferToWav(buf);
    _blobUrls.set(type, URL.createObjectURL(new Blob([wav], { type: "audio/wav" })));
  })().catch(() => {});
  _renderP.set(type, p as Promise<void>);
  return p as Promise<void>;
}

// 모듈 로드 시 모든 소리 렌더링 시작 (사용자 제스처 불필요)
for (const opt of SOUND_OPTIONS) startRender(opt.id);

// ── 오디오 풀 (타입별 최대 3개 엘리먼트 재사용) ───────────────────────────
const _pool = new Map<SoundType, HTMLAudioElement[]>();

function getPoolEl(type: SoundType): HTMLAudioElement | null {
  const pool = _pool.get(type) ?? [];
  for (const el of pool) { if (el.paused || el.ended) return el; }
  return null;
}

function addToPool(type: SoundType, el: HTMLAudioElement) {
  if (!_pool.has(type)) _pool.set(type, []);
  const pool = _pool.get(type)!;
  if (pool.length < 3) pool.push(el);
}

// ── iOS/Android 잠금 해제 ──────────────────────────────────────────────────
// 무음 WAV 1회 재생으로 도메인 전체 오디오 잠금 해제 (iOS 13+, Android Chrome)
let _unlocked = false;

function tryUnlock() {
  if (_unlocked) return;
  const el = new Audio(_silentUrl);
  el.volume = 0.001;
  const p = el.play();
  if (p !== undefined) {
    p.then(() => { _unlocked = true; el.pause(); }).catch(() => {});
  } else {
    _unlocked = true;
  }
}

// 페이지 복귀 시 재잠금 해제 (화면 복귀 후에도 소리 유지)
function attachVisibilityResume() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      _unlocked = false; // 강제 재잠금 해제 시도
      tryUnlock();
    }
  });
}

// ── 공개 API ───────────────────────────────────────────────────────────────
let _attached = false;

export function attachAudioUnlock() {
  if (_attached) return;
  _attached = true;
  attachVisibilityResume();
  const handler = () => unlockAudioContext();
  document.addEventListener("touchstart", handler, { capture: true, passive: true });
  document.addEventListener("mousedown", handler, { capture: true });
}

export function unlockAudioContext() {
  tryUnlock();
}

export function playSound(type: SoundType) {
  const url = _blobUrls.get(type);

  if (url) {
    // URL 준비됨 — 풀에서 엘리먼트 재사용 또는 새로 생성
    let el = getPoolEl(type);
    if (!el) {
      el = new Audio(url);
      addToPool(type, el);
    }
    el.currentTime = 0;
    el.volume = 1;
    el.play().catch(() => {});
    return;
  }

  // URL 아직 렌더링 중 — 완료 후 재생
  startRender(type).then(() => {
    const readyUrl = _blobUrls.get(type);
    if (!readyUrl) return;
    let el = getPoolEl(type);
    if (!el) { el = new Audio(readyUrl); addToPool(type, el); }
    el.currentTime = 0; el.volume = 1;
    el.play().catch(() => {});
  });
}

export function playNotificationSound(role?: "customer" | "admin" | "staff") {
  const type = role ? getSoundType(role) : "ding";
  playSound(type);
}
