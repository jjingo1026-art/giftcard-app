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
