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

// ── 설정 (localStorage + 메모리 캐시) ─────────────────────────────────────
const _enabledCache = new Map<string, boolean>();
const _typeCache = new Map<string, SoundType>();

export function getSoundEnabled(role: "customer" | "admin" | "staff"): boolean {
  if (_enabledCache.has(role)) return _enabledCache.get(role)!;
  const val = localStorage.getItem(SOUND_KEY_PREFIX + role);
  const result = val === null ? true : val === "true";
  _enabledCache.set(role, result);
  return result;
}
export function setSoundEnabled(role: "customer" | "admin" | "staff", enabled: boolean) {
  localStorage.setItem(SOUND_KEY_PREFIX + role, String(enabled));
  _enabledCache.set(role, enabled);
}
export function getSoundType(role: "customer" | "admin" | "staff"): SoundType {
  if (_typeCache.has(role)) return _typeCache.get(role)!;
  const val = (localStorage.getItem(SOUND_TYPE_KEY_PREFIX + role) as SoundType) || "ding";
  _typeCache.set(role, val);
  return val;
}
export function setSoundType(role: "customer" | "admin" | "staff", type: SoundType) {
  localStorage.setItem(SOUND_TYPE_KEY_PREFIX + role, type);
  _typeCache.set(role, type); // 메모리 캐시에도 즉시 반영
}

// ── Web Audio API (데스크톱/지원 환경) ────────────────────────────────────
let _ctx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  try {
    if (!_ctx || _ctx.state === "closed") {
      _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return _ctx;
  } catch { return null; }
}

function playWithWebAudio(type: SoundType) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const doPlay = (c: AudioContext) => {
    try {
      if (type === "ding") {
        const o = c.createOscillator(), g = c.createGain();
        o.connect(g); g.connect(c.destination); o.type = "sine";
        o.frequency.setValueAtTime(880, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(660, c.currentTime + 0.15);
        g.gain.setValueAtTime(0.5, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.55);
        o.start(c.currentTime); o.stop(c.currentTime + 0.6);
      } else if (type === "dingdong") {
        [[784, 0, 0.35], [523, 0.35, 0.35]].forEach(([f, t, d]) => {
          const o = c.createOscillator(), g = c.createGain();
          o.connect(g); g.connect(c.destination); o.type = "sine";
          o.frequency.setValueAtTime(f, c.currentTime + t);
          g.gain.setValueAtTime(0.4, c.currentTime + t);
          g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t + d);
          o.start(c.currentTime + t); o.stop(c.currentTime + t + d);
        });
      } else if (type === "pop") {
        const o = c.createOscillator(), g = c.createGain();
        o.connect(g); g.connect(c.destination); o.type = "sine";
        o.frequency.setValueAtTime(1200, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(400, c.currentTime + 0.08);
        g.gain.setValueAtTime(0.6, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.14);
        o.start(c.currentTime); o.stop(c.currentTime + 0.15);
      } else if (type === "chime") {
        [523, 659, 784, 1047].forEach((f, i) => {
          const o = c.createOscillator(), g = c.createGain();
          o.connect(g); g.connect(c.destination); o.type = "sine";
          const t = i * 0.18;
          o.frequency.setValueAtTime(f, c.currentTime + t);
          g.gain.setValueAtTime(0.35, c.currentTime + t);
          g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t + 0.5);
          o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.5);
        });
      } else if (type === "alert") {
        [0, 0.22, 0.44].forEach((t) => {
          const o = c.createOscillator(), g = c.createGain();
          o.connect(g); g.connect(c.destination); o.type = "square";
          o.frequency.setValueAtTime(880, c.currentTime + t);
          g.gain.setValueAtTime(0.25, c.currentTime + t);
          g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t + 0.18);
          o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.18);
        });
      }
    } catch { /* 무시 */ }
  };

  if (ctx.state === "suspended") {
    ctx.resume().then(() => doPlay(ctx)).catch(() => {});
  } else if (ctx.state === "running") {
    doPlay(ctx);
  }
}

// ── HTMLAudioElement (모바일 호환) ─────────────────────────────────────────
// OfflineAudioContext로 소리를 렌더링해 data: URI로 저장 (blob URL보다 호환성 우수)

function audioBufferToDataUri(buf: AudioBuffer): string {
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
  // ArrayBuffer → base64 → data URI
  const bytes = new Uint8Array(ab);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return "data:audio/wav;base64," + btoa(bin);
}

const SR = 22050;
const DURATIONS: Record<SoundType, number> = {
  ding: 0.65, dingdong: 0.75, pop: 0.2, chime: 1.1, alert: 0.68,
};

function buildOfflineSound(ctx: OfflineAudioContext, type: SoundType) {
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

// data: URI 캐시 (렌더링 완료 후 저장)
const _dataUris = new Map<SoundType, string>();
const _renderP = new Map<SoundType, Promise<void>>();

function ensureDataUri(type: SoundType): Promise<void> {
  if (_dataUris.has(type)) return Promise.resolve();
  if (_renderP.has(type)) return _renderP.get(type)!;
  const p = (async () => {
    const oac = new OfflineAudioContext(1, Math.ceil(SR * DURATIONS[type]), SR);
    buildOfflineSound(oac, type);
    const buf = await oac.startRendering();
    _dataUris.set(type, audioBufferToDataUri(buf));
  })().catch(() => {});
  _renderP.set(type, p as Promise<void>);
  return p as Promise<void>;
}

// 모듈 로드 시 즉시 렌더링 시작
for (const opt of SOUND_OPTIONS) ensureDataUri(opt.id);

// HTMLAudioElement 풀 (타입별 최대 3개)
const _pool = new Map<SoundType, HTMLAudioElement[]>();
let _htmlAudioUnlocked = false; // 사용자 제스처로 HTMLAudio 잠금 해제됐는지

function getPoolEl(type: SoundType): HTMLAudioElement | null {
  const pool = _pool.get(type) ?? [];
  for (const el of pool) { if (el.paused || el.ended) return el; }
  return null;
}

function makeAudioEl(type: SoundType): HTMLAudioElement | null {
  const uri = _dataUris.get(type);
  if (!uri) return null;
  const el = new Audio(uri);
  if (!_pool.has(type)) _pool.set(type, []);
  const pool = _pool.get(type)!;
  if (pool.length < 3) pool.push(el);
  return el;
}

// 사용자 제스처 시 모든 HTMLAudio 엘리먼트 프라임 (play+pause)
function primeHtmlAudio() {
  if (_htmlAudioUnlocked) return;
  _htmlAudioUnlocked = true;
  for (const type of SOUND_OPTIONS.map(o => o.id)) {
    const uri = _dataUris.get(type);
    if (!uri) continue;
    try {
      let el = getPoolEl(type);
      if (!el) el = makeAudioEl(type)!;
      if (!el) continue;
      el.volume = 0.001;
      const p = el.play();
      if (p) {
        p.then(() => { el!.pause(); el!.currentTime = 0; el!.volume = 1; }).catch(() => {});
      }
    } catch { /* 무시 */ }
  }
}

// ── 공개 API ───────────────────────────────────────────────────────────────
let _attached = false;

export function attachAudioUnlock() {
  if (_attached) return;
  _attached = true;

  // visibilitychange: 화면 복귀 시 Web Audio context 재개
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !_ctx) return;
    if (_ctx.state === "suspended") {
      _ctx.resume().catch(() => {});
    }
  });

  const handler = () => unlockAudioContext();
  document.addEventListener("touchstart", handler, { capture: true, passive: true });
  document.addEventListener("mousedown", handler, { capture: true });
}

export function unlockAudioContext() {
  // Web Audio API 잠금 해제
  const ctx = getAudioCtx();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  // HTMLAudio 프라임 (렌더링 완료된 것만)
  primeHtmlAudio();
}

// ── 재생 (Web Audio 우선, 실패 시 HTMLAudio 폴백) ─────────────────────────
export function playSound(type: SoundType) {
  // 1차: Web Audio API (데스크톱 / AudioContext running)
  const ctx = getAudioCtx();
  if (ctx && ctx.state === "running") {
    playWithWebAudio(type);
    return;
  }

  // 2차: HTMLAudio (모바일 / AudioContext suspended)
  const uri = _dataUris.get(type);
  if (uri) {
    let el = getPoolEl(type);
    if (!el) el = makeAudioEl(type);
    if (el) {
      el.currentTime = 0;
      el.volume = 1;
      el.play().catch(() => {});
      return;
    }
  }

  // 3차: data URI 아직 렌더링 중 — 완료 후 재시도
  ensureDataUri(type).then(() => {
    const ctx2 = getAudioCtx();
    if (ctx2 && ctx2.state === "running") {
      playWithWebAudio(type);
    } else {
      let el = getPoolEl(type);
      if (!el) el = makeAudioEl(type);
      if (el) { el.currentTime = 0; el.volume = 1; el.play().catch(() => {}); }
    }
  });
}

export function playNotificationSound(role?: "customer" | "admin" | "staff") {
  const type = role ? getSoundType(role) : "ding";
  playSound(type);
}
