import { useState, useEffect } from "react";
import { staffFetch } from "@/lib/authFetch";

interface ChatRoom {
  reservationId: number;
  name: string;
  phone: string;
  status: string;
  date: string | null;
  time: string | null;
  lastMessage: string | null;
  lastSender: string | null;
  lastTime: string | null;
  unreadCount: number;
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending:   { text: "대기중",  cls: "bg-yellow-50 text-yellow-600 border-yellow-200" },
  assigned:  { text: "배정됨", cls: "bg-blue-50 text-blue-600 border-blue-200" },
  completed: { text: "완료",   cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  no_show:   { text: "노쇼",   cls: "bg-slate-100 text-slate-500 border-slate-200" },
  cancelled: { text: "취소",   cls: "bg-rose-50 text-rose-400 border-rose-100" },
};

function formatRelativeTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function previewMessage(msg: string | null) {
  if (!msg) return "메시지 없음";
  if (msg.startsWith("[IMG:")) return "📷 사진";
  return msg.replace(/\n/g, " ").slice(0, 40);
}

export default function StaffChatList() {
  const token = localStorage.getItem("gc_staff_token");
  const staffName = localStorage.getItem("gc_staff_name") ?? "담당자";

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!token) { window.location.href = "/staff/login"; return; }
    staffFetch("/api/admin/staff/chat-list")
      .then((r) => r.json())
      .then((data) => setRooms(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalUnread = rooms.reduce((s, r) => s + r.unreadCount, 0);

  const filtered = rooms.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.name.toLowerCase().includes(q) || r.phone.includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => { window.location.href = "/staff/dashboard"; }}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-500 flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[16px] font-black text-slate-800">채팅 전체보기</p>
              {totalUnread > 0 && (
                <span className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {totalUnread}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">👨‍🔧 {staffName} · {rooms.length}개 채팅방</p>
          </div>
        </div>
        {/* 검색 */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름·전화번호 검색"
              className="flex-1 bg-transparent text-[14px] text-slate-700 outline-none placeholder:text-slate-300"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-slate-300 hover:text-slate-500">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading && (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            <p className="text-[13px] text-slate-300 mt-3">불러오는 중...</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="py-20 text-center">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-[14px] font-semibold text-slate-400">
              {search ? "검색 결과가 없습니다" : "아직 채팅 기록이 없습니다"}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((room) => {
            const sl = STATUS_LABEL[room.status] ?? { text: room.status, cls: "bg-slate-100 text-slate-500 border-slate-200" };
            const hasUnread = room.unreadCount > 0;
            return (
              <button
                key={room.reservationId}
                onClick={() => { window.location.href = `/staff/chat?id=${room.reservationId}`; }}
                className={`w-full text-left bg-white rounded-2xl border shadow-sm px-4 py-3.5 flex items-center gap-3 hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.99] ${
                  hasUnread ? "border-indigo-200 bg-indigo-50/30" : "border-slate-100"
                }`}
              >
                {/* 아바타 */}
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-[17px] font-black ${
                  hasUnread ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-400"
                }`}>
                  {room.name[0]}
                </div>

                {/* 본문 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`text-[14px] font-bold truncate ${hasUnread ? "text-slate-900" : "text-slate-700"}`}>
                      {room.name}
                    </p>
                    <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${sl.cls}`}>
                      {sl.text}
                    </span>
                  </div>
                  <p className={`text-[12px] truncate ${hasUnread ? "text-slate-600 font-medium" : "text-slate-400"}`}>
                    {room.lastSender ? <span className="text-slate-400">{room.lastSender}: </span> : null}
                    {previewMessage(room.lastMessage)}
                  </p>
                </div>

                {/* 우측 */}
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  <p className="text-[10px] text-slate-300">{formatRelativeTime(room.lastTime)}</p>
                  {hasUnread ? (
                    <span className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                      {room.unreadCount}
                    </span>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
