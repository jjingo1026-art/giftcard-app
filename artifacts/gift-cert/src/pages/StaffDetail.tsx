import { useState, useEffect, useRef } from "react";

interface Message {
  id: number;
  sender: string;
  senderName: string;
  message: string;
  time: string;
}

function getReservationId() {
  return new URLSearchParams(window.location.search).get("id");
}

export default function StaffDetail() {
  const token = localStorage.getItem("gc_staff_token");
  const staffName = localStorage.getItem("gc_staff_name") ?? "매입담당자";
  const reservationId = getReservationId();

  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [msg, setMsg] = useState("");
  const [acting, setActing] = useState(false);
  const [status, setStatus] = useState<"pending" | "completed" | "no_show">("pending");
  const chatBoxRef = useRef<HTMLDivElement>(null);

  const [showDefectModal, setShowDefectModal] = useState(false);
  const [defectDetail, setDefectDetail] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    if (!token) { window.location.href = "/staff/login"; return; }
    if (!reservationId) return;
    loadChat();
    const es = new EventSource(`/api/admin/chat/stream/${reservationId}`);
    es.onmessage = (e) => {
      const m = JSON.parse(e.data);
      setChatMessages((prev) => {
        if (prev.some((p) => p.id === m.id)) return prev;
        const next = [...prev, m];
        setTimeout(() => { if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight; }, 50);
        return next;
      });
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [chatMessages]);

  function loadChat() {
    fetch(`/api/admin/chat/${reservationId}`)
      .then((r) => r.json())
      .then(setChatMessages)
      .catch(() => {});
  }

  async function send() {
    if (!msg.trim()) return;
    await fetch("/api/admin/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId: Number(reservationId), sender: "staff", senderName: staffName, message: msg }),
    });
    setMsg("");
    loadChat();
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  async function sendSystemMessage(message: string) {
    await fetch("/api/admin/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId: Number(reservationId), sender: "staff", senderName: staffName, message }),
    });
    loadChat();
  }

  async function handlePaymentRequest() {
    if (!confirm("고객에게 입금 요청 메시지를 발송하시겠습니까?")) return;
    setSendingRequest(true);
    try {
      await sendSystemMessage("💰 입금을 요청드립니다.\n상품권 확인이 완료되었으니, 안내드린 계좌로 입금해 주세요.\n입금 후 채팅으로 알려주시면 감사하겠습니다.");
    } finally {
      setSendingRequest(false);
    }
  }

  async function handleDefectSubmit() {
    if (!defectDetail.trim()) return;
    setSendingRequest(true);
    try {
      await sendSystemMessage(`⚠️ 일부 하자 안내\n${defectDetail.trim()}\n\n처리 방법에 대해 아래 채팅으로 협의 부탁드립니다.`);
      setShowDefectModal(false);
      setDefectDetail("");
    } finally {
      setSendingRequest(false);
    }
  }

  async function handleAction(next: "completed" | "no_show") {
    if (!reservationId || acting || status !== "pending") return;
    const label = next === "completed" ? "매입 완료 처리" : "노쇼 처리";
    if (!confirm(`${label}하시겠습니까?`)) return;
    setActing(true);
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(next);
        loadChat();
      } else {
        alert(data.error ?? "처리 중 오류가 발생했습니다.");
      }
    } catch {
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setActing(false);
    }
  }

  /* 하단 고정 바 높이:
     - 채팅 입력줄: ~56px
     - 버튼 2행: ~112px
     - 패딩: ~24px
     → 총 약 192px (완료/노쇼 시 ~72px) */
  const bottomH = status === "pending" ? 196 : 72;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm flex-shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => { window.location.href = "/staff/dashboard"; }}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="text-[15px] font-bold text-slate-800">예약 #{reservationId} 채팅</h1>
            {status === "completed" && <p className="text-[11px] text-emerald-600 font-bold">✅ 매입 완료</p>}
            {status === "no_show" && <p className="text-[11px] text-rose-500 font-bold">🚫 노쇼 처리됨</p>}
          </div>
        </div>
      </header>

      {/* 채팅 영역 */}
      <div
        ref={chatBoxRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2 max-w-2xl w-full mx-auto"
        style={{ paddingBottom: bottomH + 16 }}
      >
        {chatMessages.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-slate-300 text-[13px]">메시지가 없습니다</p>
          </div>
        )}
        {chatMessages.map((m) => {
          const isMine = m.sender === "staff";
          return (
            <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-[14px] leading-snug ${
                isMine
                  ? "bg-indigo-500 text-white rounded-br-sm"
                  : "bg-white border border-slate-100 shadow-sm text-slate-800 rounded-bl-sm"
              }`}>
                {!isMine && <p className="text-[11px] font-bold mb-0.5 opacity-60">{m.senderName}</p>}
                <p className="whitespace-pre-wrap">{m.message}</p>
                <p className={`text-[10px] mt-1 ${isMine ? "text-indigo-200 text-right" : "text-slate-400"}`}>
                  {new Date(m.time).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 하단 고정 바 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-4 space-y-2">

          {/* 채팅 입력 */}
          <div className="flex gap-2">
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={handleKey}
              placeholder="메시지 입력"
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-[14px] outline-none focus:border-indigo-400 focus:bg-white transition-colors"
            />
            <button
              onClick={send}
              className="px-5 py-3 rounded-2xl bg-indigo-500 text-white text-[14px] font-bold hover:bg-indigo-600 transition-colors active:scale-95"
            >
              전송
            </button>
          </div>

          {/* 액션 버튼 */}
          {status === "pending" ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAction("completed")}
                disabled={acting}
                className="py-3 rounded-2xl text-white text-[13px] font-bold transition-all active:scale-95 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}
              >
                {acting ? "처리 중…" : "✅ 매입완료"}
              </button>
              <button
                onClick={() => handleAction("no_show")}
                disabled={acting}
                className="py-3 rounded-2xl text-white text-[13px] font-bold transition-all active:scale-95 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#f43f5e,#e11d48)" }}
              >
                {acting ? "처리 중…" : "🚫 노쇼"}
              </button>
              <button
                onClick={handlePaymentRequest}
                disabled={sendingRequest}
                className="py-3 rounded-2xl text-white text-[13px] font-bold transition-all active:scale-95 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}
              >
                {sendingRequest ? "발송 중…" : "💰 입금요청"}
              </button>
              <button
                onClick={() => setShowDefectModal(true)}
                disabled={sendingRequest}
                className="py-3 rounded-2xl text-white text-[13px] font-bold transition-all active:scale-95 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
              >
                ⚠️ 일부하자
              </button>
            </div>
          ) : (
            <div className={`px-4 py-2.5 rounded-2xl text-[13px] font-bold text-center ${
              status === "completed"
                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                : "bg-rose-50 text-rose-500 border border-rose-100"
            }`}>
              {status === "completed" ? "✅ 매입 완료 처리되었습니다." : "🚫 노쇼 처리되었습니다."}
            </div>
          )}
        </div>
      </div>

      {/* 일부하자 모달 */}
      {showDefectModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-bold text-slate-800">⚠️ 일부 하자 안내</h3>
                <p className="text-[12px] text-slate-400 mt-0.5">하자 내용을 입력하면 채팅으로 발송됩니다</p>
              </div>
              <button
                onClick={() => { setShowDefectModal(false); setDefectDetail(""); }}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <textarea
              value={defectDetail}
              onChange={(e) => setDefectDetail(e.target.value)}
              placeholder="예: 신세계 50,000원권 2매에 찢김 발견. 나머지 정상 처리 가능합니다."
              rows={4}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-[14px] outline-none focus:border-amber-400 resize-none placeholder:text-slate-300"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDefectModal(false); setDefectDetail(""); }}
                className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 text-[14px] font-bold hover:bg-slate-50"
              >취소</button>
              <button
                onClick={handleDefectSubmit}
                disabled={!defectDetail.trim() || sendingRequest}
                className="flex-1 py-3 rounded-2xl text-white text-[14px] font-bold disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
              >{sendingRequest ? "발송 중…" : "📨 발송하기"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
