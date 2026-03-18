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

export default function CustomerChat() {
  const reservationId = getReservationId();

  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [msg, setMsg] = useState("");
  const chatBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!reservationId) return;
    loadChat();
    const interval = setInterval(loadChat, 2000);
    return () => clearInterval(interval);
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
      body: JSON.stringify({ reservationId: Number(reservationId), sender: "customer", message: msg }),
    });
    setMsg("");
    loadChat();
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => history.back()} className="text-slate-400 hover:text-slate-600">←</button>
          <h1 className="text-[16px] font-bold text-slate-800">상담 채팅 · 예약 #{reservationId}</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        <h3 className="text-[15px] font-bold text-slate-700">채팅</h3>

        <div
          ref={chatBoxRef}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 space-y-2 overflow-auto"
          style={{ height: 300 }}
        >
          {chatMessages.length === 0 && (
            <p className="text-center text-slate-300 text-[13px] mt-10">메시지가 없습니다</p>
          )}
          {chatMessages.map((m) => {
            const isMine = m.sender === "customer";
            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-[14px] ${
                  isMine
                    ? "bg-indigo-500 text-white rounded-br-sm"
                    : "bg-slate-100 text-slate-800 rounded-bl-sm"
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
