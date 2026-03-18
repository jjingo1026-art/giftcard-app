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
  const token = sessionStorage.getItem("gc_staff_token");
  const staffName = sessionStorage.getItem("gc_staff_name") ?? "매입담당자";
  const reservationId = getReservationId();

  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [msg, setMsg] = useState("");
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) { location.href = "/staff/login.html"; return; }
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

  async function complete() {
    if (!reservationId || completing || completed) return;
    if (!confirm("매입 완료 처리하시겠습니까?")) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "completed" }),
      });
      const data = await res.json();
      if (data.success) {
        setCompleted(true);
        loadChat();
      } else {
        alert(data.error ?? "처리 중 오류가 발생했습니다.");
      }
    } catch {
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => history.back()} className="text-slate-400 hover:text-slate-600">
            ←
          </button>
          <h1 className="text-[16px] font-bold text-slate-800">예약 #{reservationId} 채팅</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {/* 매입 완료 버튼 */}
        {completed ? (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
            <span className="text-emerald-600 font-bold text-[14px]">✅ 매입 완료 처리되었습니다.</span>
          </div>
        ) : (
          <button
            onClick={complete}
            disabled={completing}
            className="w-full py-3.5 rounded-2xl text-white text-[15px] font-bold transition-all active:scale-95 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}
          >
            {completing ? "처리 중…" : "✅ 매입 완료"}
          </button>
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
