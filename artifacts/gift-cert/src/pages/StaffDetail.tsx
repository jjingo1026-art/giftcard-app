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
        setTimeout(() => scrollToBottom(), 50);
        return next;
      });
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  function scrollToBottom() {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }

  function loadChat() {
    fetch(`/api/admin/chat/${reservationId}`)
      .then((r) => r.json())
      .then(setChatMessages)
      .catch(() => {});
  }

  async function send() {
    if (!msg.trim()) return;
    const text = msg;
    setMsg("");
    await fetch("/api/admin/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reservationId: Number(reservationId),
        sender: "staff",
        senderName: staffName,
        message: text,
      }),
    });
    loadChat();
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      {/* 채팅 창 */}
      <div
        className="w-full max-w-lg flex flex-col rounded-3xl overflow-hidden shadow-2xl"
        style={{ height: "calc(100vh - 48px)", maxHeight: 760 }}
      >
        {/* 창 헤더 */}
        <div
          className="flex-shrink-0 flex items-center gap-3 px-5 py-4"
          style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}
        >
          <button
            onClick={() => { window.location.href = "/staff/dashboard"; }}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-white flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-[15px] truncate">예약 #{reservationId} 채팅</p>
            <p className="text-indigo-200 text-[11px]">담당자: {staffName}</p>
          </div>
          {/* 창 조작 버튼 (데코) */}
          <div className="flex gap-1.5 flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-white/30" />
            <div className="w-3 h-3 rounded-full bg-white/30" />
            <div className="w-3 h-3 rounded-full bg-white/30" />
          </div>
        </div>

        {/* 메시지 영역 */}
        <div
          ref={chatBoxRef}
          className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 space-y-3"
        >
          {chatMessages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl">💬</div>
              <p className="text-[13px] text-slate-400 font-medium">아직 메시지가 없습니다</p>
              <p className="text-[11px] text-slate-300">첫 메시지를 보내보세요</p>
            </div>
          )}
          {chatMessages.map((m) => {
            const isMine = m.sender === "staff";
            return (
              <div key={m.id} className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
                {/* 상대방 아바타 */}
                {!isMine && (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[12px] font-bold text-indigo-500 flex-shrink-0 mb-1">
                    {(m.senderName ?? "?")[0]}
                  </div>
                )}
                <div className={`flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[72%]`}>
                  {!isMine && (
                    <p className="text-[11px] text-slate-400 font-semibold ml-1 mb-1">{m.senderName}</p>
                  )}
                  <div className={`px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed ${
                    isMine
                      ? "bg-indigo-500 text-white rounded-br-sm"
                      : "bg-white border border-slate-100 shadow-sm text-slate-800 rounded-bl-sm"
                  }`}>
                    <p className="whitespace-pre-wrap">{m.message}</p>
                  </div>
                  <p className={`text-[10px] mt-1 mx-1 ${isMine ? "text-slate-400" : "text-slate-400"}`}>
                    {new Date(m.time).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {/* 내 아바타 */}
                {isMine && (
                  <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0 mb-1">
                    {staffName[0]}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 입력 영역 */}
        <div className="flex-shrink-0 bg-white border-t border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={handleKey}
              placeholder="메시지를 입력하세요…"
              className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-[14px] outline-none focus:border-indigo-400 focus:bg-white transition-colors"
            />
            <button
              onClick={send}
              disabled={!msg.trim()}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-indigo-500 text-white hover:bg-indigo-600 transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
