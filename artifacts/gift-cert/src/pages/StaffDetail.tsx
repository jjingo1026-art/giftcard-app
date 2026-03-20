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

  // 입금요청 / 일부하자 상태
  const [showDefectModal, setShowDefectModal] = useState(false);
  const [defectDetail, setDefectDetail] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    if (!token) { window.location.href = "/staff/login"; return; }
    if (!reservationId) return;
    loadChat();
    const es = new EventSource(`/api/admin/chat/stream/${reservationId}`);
    es.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const next = [...prev, msg];
        setTimeout(() => { if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight; }, 50);
        return next;
      });
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
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
      body: JSON.stringify({ reservationId: Number(reservationId), sender: "staff", message: msg }),
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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => { window.location.href = "/staff/dashboard"; }} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="text-[16px] font-bold text-slate-800">예약 #{reservationId} 채팅</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {/* 상태 버튼 영역 */}
        {status === "completed" ? (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
            <span className="text-emerald-600 font-bold text-[14px]">✅ 매입 완료 처리되었습니다.</span>
          </div>
        ) : status === "no_show" ? (
          <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-100 rounded-2xl">
            <span className="text-rose-600 font-bold text-[14px]">🚫 노쇼 처리되었습니다.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {/* 1행: 매입 완료 / 노쇼 */}
            <div className="flex gap-2">
              <button
                onClick={() => handleAction("completed")}
                disabled={acting}
                className="flex-1 py-3.5 rounded-2xl text-white text-[15px] font-bold transition-all active:scale-95 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}
              >
                {acting ? "처리 중…" : "✅ 매입 완료"}
              </button>
              <button
                onClick={() => handleAction("no_show")}
                disabled={acting}
                className="flex-1 py-3.5 rounded-2xl text-white text-[15px] font-bold transition-all active:scale-95 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#f43f5e,#e11d48)" }}
              >
                {acting ? "처리 중…" : "🚫 노쇼"}
              </button>
            </div>
            {/* 2행: 입금요청 / 일부하자 */}
            <div className="flex gap-2">
              <button
                onClick={handlePaymentRequest}
                disabled={sendingRequest}
                className="flex-1 py-3 rounded-2xl font-bold text-[14px] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff" }}
              >
                <span>💰</span>
                {sendingRequest ? "발송 중…" : "입금 요청"}
              </button>
              <button
                onClick={() => setShowDefectModal(true)}
                disabled={sendingRequest}
                className="flex-1 py-3 rounded-2xl font-bold text-[14px] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff" }}
              >
                <span>⚠️</span>
                일부 하자
              </button>
            </div>
          </div>
        )}

        {/* 일부하자 모달 */}
        {showDefectModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[16px] font-bold text-slate-800">⚠️ 일부 하자 안내</h3>
                  <p className="text-[12px] text-slate-400 mt-0.5">하자 내용을 입력하면 고객에게 자동 발송됩니다</p>
                </div>
                <button
                  onClick={() => { setShowDefectModal(false); setDefectDetail(""); }}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                </button>
              </div>
              <textarea
                value={defectDetail}
                onChange={(e) => setDefectDetail(e.target.value)}
                placeholder="예: 신세계 50,000원권 2매에 찢김 발견. 나머지 정상 처리 가능합니다."
                rows={4}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-[14px] text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-50 resize-none placeholder:text-slate-300"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowDefectModal(false); setDefectDetail(""); }}
                  className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 text-[14px] font-bold hover:bg-slate-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleDefectSubmit}
                  disabled={!defectDetail.trim() || sendingRequest}
                  className="flex-1 py-3 rounded-2xl text-white text-[14px] font-bold transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
                >
                  {sendingRequest ? "발송 중…" : "📨 발송하기"}
                </button>
              </div>
            </div>
          </div>
        )}

        <h3 className="text-[15px] font-bold text-slate-700">채팅</h3>

        {/* 채팅박스 */}
        <div
          ref={chatBoxRef}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 space-y-2 overflow-auto"
          style={{ height: 300 }}
        >
          {chatMessages.length === 0 && (
            <p className="text-center text-slate-300 text-[13px] mt-10">메시지가 없습니다</p>
          )}
          {chatMessages.map((m) => {
            const isMine = m.sender === "staff";
            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-[14px] ${
                  isMine ? "bg-indigo-500 text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm"
                }`}>
                  {!isMine && <p className="text-[11px] font-bold mb-0.5 opacity-60">{m.senderName}</p>}
                  <p>{m.message}</p>
                  <p className={`text-[10px] mt-0.5 ${isMine ? "text-indigo-200" : "text-slate-400"}`}>
                    {new Date(m.time).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 입력창 */}
        <div className="flex gap-2">
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={handleKey}
            placeholder="메시지 입력"
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-[14px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
          />
          <button
            onClick={send}
            className="px-5 py-3 rounded-2xl bg-indigo-500 text-white text-[14px] font-bold hover:bg-indigo-600 transition-colors active:scale-95"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
