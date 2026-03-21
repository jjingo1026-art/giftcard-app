const SOUND_KEY_PREFIX = "gc_sound_";

export function getSoundEnabled(role: "customer" | "admin" | "staff"): boolean {
  const val = localStorage.getItem(SOUND_KEY_PREFIX + role);
  return val === null ? true : val === "true";
}

export function setSoundEnabled(role: "customer" | "admin" | "staff", enabled: boolean) {
  localStorage.setItem(SOUND_KEY_PREFIX + role, String(enabled));
}

export function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => ctx.close();
  } catch {
    // 사운드 재생 실패 시 무시
  }
}
