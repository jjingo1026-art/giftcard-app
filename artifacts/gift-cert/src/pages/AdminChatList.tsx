import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getAdminToken, adminFetch } from "./AdminLogin";

interface ChatListItem {
  reservationId: number;
  name?: string;
  phone: string;
  location: string;
  status: string;
  date?: string;
  unreadCount: number;
  lastMessage: string;
  lastSender: string;
  lastSenderRole: string;
  lastTime: string;
}

const STATUS_COLOR: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700",
  assigned:  "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-400",
  no_show:   "bg-rose-100 text-rose-500",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "대기", assigned: "배정", completed: "완료", cancelled: "취소", no_show: "노쇼",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "방금";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function senderIcon(role: string) {
  if (role === "staff") return "👨‍🔧";
  if (role === "customer") return "👤";
  if (role === "system") return "🤖";
  return "💬";
}

export default function AdminChatList() {
  const [, navigate] = useLocation();
  const token = getAdminToken();
  if (!token) { navigate("/admin/login"); return null; }

  const [items, setItems] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    adminFetch("/api/admin/chat-list")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setItems(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter((it) =>
        (it.name ?? "").toLowerCase().includes(q) ||
        it.phone.replace(/-/g, "").includes(q.replace(/-/g, "")) ||
        it.location.toLowerCase().includes(q) ||
        it.lastMessage.toLowerCase().includes(q)
      )
    : items;

  const totalUnread = items.reduce((s, it) => s + it.unreadCount, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M12 4l-6 6 6 6" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-bold text-slate-800 flex items-center gap-2">
              💬 채팅 전체 목록
              {totalUnread > 0 && (
                <span className="text-[11px] font-black text-white bg-rose-500 px-2 py-0.5 rounded-full">
                  미확인 {totalUnread}
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">총 {items.length}개 대화</p>
          </div>
        </div>
        {/* 검색 */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-[14px]">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름 · 전화번호 · 장소 · 메시지 검색"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13px] outline-none focus:border-indigo-400 focus:bg-white transition-all placeholder:text-slate-300"
            />
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-3 space-y-1.5">
        {loading && (
          <div className="py-16 text-center text-slate-300 text-[14px]">불러오는 중...</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-slate-300 text-[14px]">
            {q ? `"${search}" 검색 결과 없음` : "채팅 내역이 없습니다"}
          </div>
        )}

        {filtered.map((item) => (
          <div
            key={item.reservationId}
            onClick={() => { window.location.href = `/admin/chat?id=${item.reservationId}`; }}
            className={`bg-white rounded-2xl border shadow-sm px-4 py-3.5 flex items-center gap-3 cursor-pointer transition-all active:scale-[0.99]
              ${item.unreadCount > 0
                ? "border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/60"}`}
          >
            {/* 발신자 아이콘 */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[18px] flex-shrink-0 border
              ${item.unreadCount > 0 ? "bg-indigo-100 border-indigo-200" : "bg-slate-100 border-slate-200"}`}>
              {senderIcon(item.lastSenderRole)}
            </div>

            {/* 내용 */}
            <div className="flex-1 min-w-0">
              {/* 상단: 이름 + 상태 + 시간 */}
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-[14px] font-bold text-slate-800 truncate">
                    {item.name ?? item.phone}
                  </p>
                  {item.date && (
                    <span className="text-[11px] text-slate-400 font-medium flex-shrink-0">
                      {item.date.slice(5).replace("-", "/")}
                    </span>
                  )}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLOR[item.status] ?? "bg-slate-100 text-slate-400"}`}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 flex-shrink-0">{timeAgo(item.lastTime)}</span>
              </div>
              {/* 장소 */}
              <p className="text-[11px] text-slate-400 mb-1">📍 {item.location}</p>
              {/* 마지막 메시지 */}
              <p className={`text-[12px] truncate ${item.unreadCount > 0 ? "text-slate-700 font-semibold" : "text-slate-400 font-normal"}`}>
                <span className={`mr-1 ${item.lastSenderRole === "staff" ? "text-violet-500" : item.lastSenderRole === "admin" ? "text-indigo-500" : "text-slate-500"}`}>
                  {item.lastSender}
                </span>
                {item.lastMessage}
              </p>
            </div>

            {/* 미읽은 수 뱃지 */}
            {item.unreadCount > 0 ? (
              <span className="min-w-[22px] h-[22px] rounded-full bg-indigo-500 text-white text-[11px] font-black flex items-center justify-center px-1.5 flex-shrink-0">
                {item.unreadCount}
              </span>
            ) : (
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="flex-shrink-0 text-slate-300">
                <path d="M8 4l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
