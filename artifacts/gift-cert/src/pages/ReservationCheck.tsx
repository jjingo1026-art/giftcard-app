import { useState } from "react";

interface StaffInfo { id: number; name: string; phone: string; }
interface ReservationInfo {
  id: number;
  name?: string;
  phone: string;
  date?: string;
  time?: string;
  location?: string;
  giftcardType?: string;
  amount?: number;
  totalPayment?: number;
  status: string;
  assignedTo?: string;
  createdAt: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:   { label: "예약완료",        color: "bg-amber-100 text-amber-700" },
  assigned:  { label: "매입담당자 배정", color: "bg-blue-100 text-blue-700" },
  completed: { label: "매입 완료",       color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "취소",            color: "bg-slate-100 text-slate-500" },
};

function fmt(n?: number | null) {
  if (!n) return "-";
  return n.toLocaleString("ko-KR") + "원";
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-[12px] text-slate-400 font-medium">{label}</span>
      <span className="text-[13px] text-slate-700 font-semibold text-right max-w-[60%] break-words">{value}</span>
    </div>
  );
}

export default function ReservationCheck() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reservation, setReservation] = useState<ReservationInfo | null>(null);
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [searched, setSearched] = useState(false);

  async function check() {
    const p = phone.trim();
    if (!p) { setError("전화번호를 입력해주세요."); return; }
    setError(""); setLoading(true); setSearched(false);
    try {
      const res = await fetch(`/api/admin/customer/reservation?phone=${encodeURIComponent(p)}`);
      const data = await res.json();
      if (data.success) {
        setReservation(data.reservation);
        setStaffInfo(data.staff ?? null);
      } else {
        setReservation(null);
        setStaffInfo(null);
      }
    } catch {
      setError("조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  const status = reservation ? (STATUS_MAP[reservation.status] ?? { label: reservation.status, color: "bg-slate-100 text-slate-500" }) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => history.back()} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="text-[16px] font-bold text-slate-800">예약 확인</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">전화번호로 예약 현황 조회</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* 검색 박스 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-5 space-y-3">
          <label className="block text-[12px] font-bold text-slate-400 uppercase tracking-wide">전화번호</label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && check()}
              placeholder="010-0000-0000"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-[14px] text-slate-700 outline-none focus:border-indigo-400 bg-slate-50"
            />
            <button
              onClick={check}
              disabled={loading}
              className="px-5 py-3 rounded-xl text-white text-[14px] font-bold transition-all active:scale-95 disabled:opacity-40 whitespace-nowrap"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              {loading ? "조회 중…" : "조회"}
            </button>
          </div>
          {error && <p className="text-[12px] text-rose-500">{error}</p>}
        </div>

        {/* 결과 없음 */}
        {searched && !reservation && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-10 text-center">
            <div className="text-3xl mb-3">🔍</div>
            <p className="text-[14px] font-semibold text-slate-600">예약 내역이 없습니다</p>
            <p className="text-[12px] text-slate-400 mt-1">입력하신 전화번호로 등록된 예약을 찾을 수 없습니다.</p>
          </div>
        )}

        {/* 예약 정보 */}
        {reservation && (
          <>
            {/* 상태 카드 */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">예약 #{reservation.id}</p>
                {status && (
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${status.color}`}>{status.label}</span>
                )}
              </div>
              <div>
                <Row label="이름" value={reservation.name} />
                <Row label="전화번호" value={reservation.phone} />
                <Row label="상품권 종류" value={reservation.giftcardType} />
                <Row label="금액" value={fmt(reservation.amount)} />
                <Row label="입금 금액" value={fmt(reservation.totalPayment)} />
                {reservation.date && <Row label="날짜 / 시간" value={`${reservation.date} ${reservation.time ?? ""}`} />}
                <Row label="거래 장소" value={reservation.location} />
              </div>
            </div>

            {/* 매입담당자 정보 */}
            {staffInfo ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">매입담당자</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-[18px]">👤</div>
                  <div>
                    <p className="text-[15px] font-bold text-slate-800">{staffInfo.name}</p>
                    <a href={`tel:${staffInfo.phone}`} className="text-[12px] text-indigo-500 font-medium">{staffInfo.phone}</a>
                  </div>
                </div>
                <a
                  href={`/chat.html?id=${reservation.id}`}
                  className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white text-[13px] font-bold transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                >
                  💬 채팅하기
                </a>
              </div>
            ) : (
              <div className="bg-indigo-50 rounded-2xl border border-indigo-100 px-5 py-4 text-center">
                <p className="text-[13px] text-indigo-600 font-semibold">매입담당자 배정 대기 중</p>
                <p className="text-[11px] text-indigo-400 mt-1">곧 담당자가 배정될 예정입니다.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
