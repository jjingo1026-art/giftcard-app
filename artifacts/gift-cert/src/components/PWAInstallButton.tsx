import { useEffect, useState } from "react";

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export default function PWAInstallButton() {
  const [platform, setPlatform] = useState<Platform>("other");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
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
      setDeferredPrompt(e);
      if (p === "android") setVisible(true);
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
