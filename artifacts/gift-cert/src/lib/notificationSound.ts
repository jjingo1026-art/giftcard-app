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

// ── OfflineAudioContext로 소리 렌더링 (사용자 제스처 불필요) ──────────────
const SR = 22050;
const DURATIONS: Record<SoundType, number> = {
  ding: 0.65, dingdong: 0.75, pop: 0.2, chime: 1.1, alert: 0.68,
};

function buildSound(ctx: OfflineAudioContext, type: SoundType) {
  if (type === "ding") {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination); osc.type = "sine";
    osc.frequency.setValueAtTime(880, 0); osc.frequency.exponentialRampToValueAtTime(660, 0.15);
    g.gain.setValueAtTime(0.5, 0); g.gain.exponentialRampToValueAtTime(0.001, 0.55);
    osc.start(0); osc.stop(0.6);
  } else if (type === "dingdong") {
    [[784, 0, 0.35], [523, 0.35, 0.35]].forEach(([f, t, d]) => {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination); osc.type = "sine";
      osc.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d); osc.start(t); osc.stop(t + d);
    });
  } else if (type === "pop") {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination); osc.type = "sine";
    osc.frequency.setValueAtTime(1200, 0); osc.frequency.exponentialRampToValueAtTime(400, 0.08);
    g.gain.setValueAtTime(0.6, 0); g.gain.exponentialRampToValueAtTime(0.001, 0.14);
    osc.start(0); osc.stop(0.15);
  } else if (type === "chime") {
    [523, 659, 784, 1047].forEach((f, i) => {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination); osc.type = "sine";
      const t = i * 0.18;
      osc.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5); osc.start(t); osc.stop(t + 0.5);
    });
  } else if (type === "alert") {
    [0, 0.22, 0.44].forEach((t) => {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination); osc.type = "square";
      osc.frequency.setValueAtTime(880, t); g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); osc.start(t); osc.stop(t + 0.18);
    });
  }
}

// ── 모듈 로드 시 즉시 렌더링 시작 (사용자 제스처 대기 전에 완료) ──────────
const _blobUrls = new Map<SoundType, string>();
const _renderP = new Map<SoundType, Promise<void>>();

function startRender(type: SoundType): Promise<void> {
  if (_renderP.has(type)) return _renderP.get(type)!;
  const p = (async () => {
    try {
      const dur = DURATIONS[type];
      const oac = new OfflineAudioContext(1, Math.ceil(SR * dur), SR);
      buildSound(oac, type);
      const buf = await oac.startRendering();
      const wav = audioBufferToWav(buf);
      const url = URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
      _blobUrls.set(type, url);
    } catch { /* 무시 */ }
  })();
  _renderP.set(type, p);
  return p;
}

// 모든 소리 즉시 렌더링 시작
for (const opt of SOUND_OPTIONS) startRender(opt.id);

// ── HTMLAudioElement 풀 ──────────────────────────────────────────────────────
const _pool = new Map<SoundType, HTMLAudioElement[]>();
let _primed = false;

// 사용자 제스처 시 호출: 이미 렌더링된 BlobURL로 audio 엘리먼트를 잠금 해제
function tryPrime() {
  if (_primed) return;
  let anyPrimed = false;
  for (const type of SOUND_OPTIONS.map(o => o.id)) {
    const url = _blobUrls.get(type);
    if (!url) continue; // 아직 렌더링 중이면 건너뜀
    if (_pool.has(type) && _pool.get(type)!.length > 0) continue; // 이미 프라임됨
    try {
      const el = new Audio(url);
      el.volume = 0.001;
      el.play().then(() => { el.pause(); el.currentTime = 0; el.volume = 1; }).catch(() => {});
      if (!_pool.has(type)) _pool.set(type, []);
      _pool.get(type)!.push(el);
      anyPrimed = true;
    } catch { /* 무시 */ }
  }
  // 모든 소리가 프라임됐으면 완료 표시
  if (_pool.size === SOUND_OPTIONS.length && SOUND_OPTIONS.every(o => (_pool.get(o.id)?.length ?? 0) > 0)) {
    _primed = true;
  } else if (anyPrimed) {
    // 일부만 프라임됨 — 렌더링 완료 후 재시도
    Promise.all([...SOUND_OPTIONS.map(o => _renderP.get(o.id)!)]).then(() => tryPrime()).catch(() => {});
  }
}

function getPoolEl(type: SoundType): HTMLAudioElement | null {
  const pool = _pool.get(type) ?? [];
  for (const el of pool) { if (el.paused || el.ended) return el; }
  return null;
}

// ── 공개 API ───────────────────────────────────────────────────────────────
let _attached = false;

export function attachAudioUnlock() {
  if (_attached) return;
  _attached = true;
  const handler = () => unlockAudioContext();
  document.addEventListener("touchstart", handler, { capture: true, passive: true });
  document.addEventListener("mousedown", handler, { capture: true });
}

export function unlockAudioContext() {
  tryPrime();
}

export function playSound(type: SoundType) {
  // 이미 프라임된 엘리먼트 사용
  let el = getPoolEl(type);
  if (el) {
    el.currentTime = 0; el.volume = 1;
    el.play().catch(() => {});
    return;
  }

  // 프라임된 엘리먼트 없음 — BlobURL 있으면 새 엘리먼트 생성
  const url = _blobUrls.get(type);
  if (url) {
    const newEl = new Audio(url);
    newEl.volume = 1;
    newEl.play().catch(() => {});
    if (!_pool.has(type)) _pool.set(type, []);
    _pool.get(type)!.push(newEl);
    return;
  }

  // BlobURL도 없음 — 렌더링 완료 대기 후 재생
  startRender(type).then(() => {
    const readyUrl = _blobUrls.get(type);
    if (!readyUrl) return;
    const newEl = new Audio(readyUrl);
    newEl.volume = 1;
    newEl.play().catch(() => {});
    if (!_pool.has(type)) _pool.set(type, []);
    _pool.get(type)!.push(newEl);
  }).catch(() => {});
}

export function playNotificationSound(role?: "customer" | "admin" | "staff") {
  const type = role ? getSoundType(role) : "ding";
  playSound(type);
}
