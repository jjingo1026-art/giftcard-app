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

// ── 단일 AudioContext 관리 ──────────────────────────────────────────────────
let _ctx: AudioContext | null = null;
let _keepAliveNode: AudioBufferSourceNode | null = null;
let _unlocked = false;
let _pendingSound: SoundType | null = null;  // 재생 대기 중인 소리

function getCtx(): AudioContext {
  if (!_ctx || _ctx.state === "closed") {
    _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    _keepAliveNode = null;
  }
  return _ctx;
}

// 무음 루프 — AudioContext가 suspended로 전환되지 않도록 유지
function startKeepAlive(ctx: AudioContext) {
  if (_keepAliveNode) return;
  try {
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0; // 완전 무음
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    _keepAliveNode = src;
  } catch { /* 무시 */ }
}

// 사용자 터치 시 AudioContext 잠금 해제 + 무음 루프 시작
export function unlockAudioContext() {
  try {
    const ctx = getCtx();
    const doUnlock = () => {
      // 무음 1프레임 재생으로 iOS 잠금 해제
      const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);

      if (ctx.state === "suspended") {
        ctx.resume().then(() => {
          startKeepAlive(ctx);
          _unlocked = true;
          // 대기 중이던 소리 재생
          if (_pendingSound) {
            const s = _pendingSound;
            _pendingSound = null;
            playSound(s);
          }
        }).catch(() => {});
      } else {
        startKeepAlive(ctx);
        _unlocked = true;
        if (_pendingSound) {
          const s = _pendingSound;
          _pendingSound = null;
          playSound(s);
        }
      }
    };
    doUnlock();
  } catch { /* 무시 */ }
}

// 화면이 다시 보일 때 AudioContext 재개 (앱 전환 후 복귀 시)
function attachVisibilityResume() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !_ctx) return;
    if (_ctx.state === "suspended") {
      _ctx.resume().then(() => {
        startKeepAlive(_ctx!);
        if (_pendingSound) {
          const s = _pendingSound;
          _pendingSound = null;
          playSound(s);
        }
      }).catch(() => {});
    }
  });
}

// 앱 최초 로드 시 호출: 첫 터치/클릭에서 잠금 해제 + visibility 핸들러 등록
let _attached = false;
export function attachAudioUnlock() {
  if (_attached) return;
  _attached = true;

  attachVisibilityResume();

  const handler = () => {
    unlockAudioContext();
    // 잠금 해제 후에도 계속 리스닝 — 앱 복귀 시 재unlock 필요
  };
  document.addEventListener("touchstart", handler, { capture: true, passive: true });
  document.addEventListener("mousedown", handler, { capture: true });
}

// ── 소리 재생 ──────────────────────────────────────────────────────────────
async function playWithCtx(fn: (ctx: AudioContext) => void) {
  try {
    const ctx = getCtx();
    if (ctx.state === "suspended") {
      // 재개 시도 — 성공 시 재생, 실패 시 대기열에 저장
      try {
        await ctx.resume();
      } catch {
        return; // 재생 불가 (pending은 호출자가 설정)
      }
    }
    if (ctx.state !== "running") return;
    fn(ctx);
  } catch { /* 무시 */ }
}

function playDing() {
  playWithCtx((ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
  });
}

function playDingDong() {
  playWithCtx((ctx) => {
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
    });
  });
}

function playPop() {
  playWithCtx((ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(); osc.stop(ctx.currentTime + 0.12);
  });
}

function playChime() {
  playWithCtx((ctx) => {
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
    });
  });
}

function playAlert() {
  playWithCtx((ctx) => {
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
    });
  });
}

export function playSound(type: SoundType) {
  try {
    // context가 running 상태가 아니면 대기열에 저장
    if (!_ctx || _ctx.state !== "running") {
      _pendingSound = type;
      return;
    }
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
    // context 상태와 무관하게 항상 대기열 설정 후 재생 시도
    _pendingSound = type;
    if (_ctx && _ctx.state === "running") {
      _pendingSound = null;
      playSound(type);
    }
    // 아니면 다음 터치 시 또는 visibility 복귀 시 자동 재생
  } catch { /* 무시 */ }
}
