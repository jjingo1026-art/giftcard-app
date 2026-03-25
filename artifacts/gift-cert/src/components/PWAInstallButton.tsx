import { useEffect, useState } from "react";

type Platform = "ios" | "android" | "desktop" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  const isMobile = /Mobi|Tablet/i.test(ua);
  if (!isMobile) return "desktop";
  return "other";
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function PWAInstallButton() {
  const [platform, setPlatform] = useState<Platform>("other");
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> } | null>(null);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    const p = detectPlatform();
    setPlatform(p);

    if (p === "ios") {
      setVisible(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> });
      if (p === "android" || p === "desktop") setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setVisible(false);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (platform === "ios") {
      setShowIOSModal(true);
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setVisible(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (installed || !visible) return null;

  if (platform === "desktop") {
    return (
      <>
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleInstall}
            className="flex items-center gap-3 px-7 py-3.5 rounded-2xl text-[15px] font-bold transition-all hover:scale-105 active:scale-95 shadow-lg"
            style={{
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "white",
              boxShadow: "0 4px 18px rgba(99,102,241,0.4)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
              <path d="M12 7v6M9 10l3 3 3-3"/>
            </svg>
            앱 설치하기
          </button>
          <p className="text-[11px] text-slate-400">PC에 앱으로 설치하면 더 편리합니다</p>
        </div>

        {showIOSModal && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setShowIOSModal(false)}
          >
            <div
              className="w-full max-w-sm rounded-t-3xl pb-10 pt-6 px-6"
              style={{ background: "white" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-5" />
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full mt-7 py-3 rounded-2xl text-[15px] font-bold text-white"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              >
                확인
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleInstall}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold transition-all active:scale-95 shadow-md"
        style={{
          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
          color: "white",
          boxShadow: "0 3px 14px rgba(99,102,241,0.4)",
        }}
      >
        <span className="text-[16px]">📲</span>
        홈화면에 앱 추가
      </button>

      {showIOSModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl pb-10 pt-6 px-6"
            style={{ background: "white" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-5" />
            <h3 className="text-[17px] font-black text-slate-800 mb-1 text-center">
              홈화면에 앱 추가하기
            </h3>
            <p className="text-[12px] text-slate-400 text-center mb-6">
              아이폰 Safari에서 아래 순서로 설치하세요
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-black text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                  1
                </div>
                <div>
                  <p className="text-[14px] font-bold text-slate-700">공유 버튼 탭</p>
                  <p className="text-[12px] text-slate-400 mt-0.5">
                    Safari 하단의 <span className="font-bold text-slate-600">□↑ 공유</span> 버튼을 탭하세요
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-black text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                  2
                </div>
                <div>
                  <p className="text-[14px] font-bold text-slate-700">홈 화면에 추가 선택</p>
                  <p className="text-[12px] text-slate-400 mt-0.5">
                    메뉴에서 <span className="font-bold text-slate-600">'홈 화면에 추가'</span>를 찾아 탭하세요
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-black text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                  3
                </div>
                <div>
                  <p className="text-[14px] font-bold text-slate-700">추가 버튼 탭</p>
                  <p className="text-[12px] text-slate-400 mt-0.5">
                    우측 상단 <span className="font-bold text-slate-600">'추가'</span>를 탭하면 완료!
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full mt-7 py-3 rounded-2xl text-[15px] font-bold text-white"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}
