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
  const chatBoxRef = useRef<HTMLDivElement>(null);

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
          <h1 className="text-[15px] font-bold text-slate-800">예약 #{reservationId} 채팅</h1>
        </div>
      </header>

      {/* 채팅 영역 */}
      <div
        ref={chatBoxRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2 max-w-2xl w-full mx-auto"
        style={{ paddingBottom: 80 }}
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

      {/* 하단 고정 바 - 채팅 입력만 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="max-w-2xl mx-auto px-4 py-3">
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
        </div>
      </div>
    </div>
  );
}
