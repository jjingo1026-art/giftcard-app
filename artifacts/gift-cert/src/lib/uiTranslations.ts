export const UI_TRANSLATIONS: Record<string, Record<string, string>> = {
  reservation_request: {
    en: "Booking Request",
    "zh-CN": "预约申请",
    "zh-TW": "預約申請",
    vi: "Yêu cầu đặt lịch",
    ja: "予約申請",
    th: "คำขอจอง",
    ru: "Запрос бронирования",
    mn: "Захиалгын хүсэлт",
    id: "Permintaan Reservasi",
  },
  sell_request: {
    en: "Sell Request",
    "zh-CN": "出售申请",
    "zh-TW": "出售申請",
    vi: "Yêu cầu bán",
    ja: "販売申請",
    th: "คำขอขาย",
    ru: "Запрос продажи",
    mn: "Зарах хүсэлт",
    id: "Permintaan Penjualan",
  },
  urgent_sell_request: {
    en: "Urgent Sell Request",
    "zh-CN": "紧急出售申请",
    "zh-TW": "緊急出售申請",
    vi: "Yêu cầu bán khẩn cấp",
    ja: "緊急販売申請",
    th: "คำขอขายด่วน",
    ru: "Срочный запрос продажи",
    mn: "Яаралтай зарах хүсэлт",
    id: "Permintaan Penjualan Mendesak",
  },
  reservation_submit: {
    en: "Submit Booking",
    "zh-CN": "提交预约",
    "zh-TW": "提交預約",
    vi: "Gửi đặt lịch",
    ja: "予約を申請する",
    th: "ส่งคำขอจอง",
    ru: "Отправить бронирование",
    mn: "Захиалга илгээх",
    id: "Kirim Pemesanan",
  },
  urgent_sell_submit: {
    en: "Submit Urgent Sale",
    "zh-CN": "提交紧急出售",
    "zh-TW": "提交緊急出售",
    vi: "Gửi yêu cầu bán khẩn cấp",
    ja: "緊急販売を申請する",
    th: "ส่งคำขอขายด่วน",
    ru: "Отправить срочную продажу",
    mn: "Яаралтай зарах хүсэлт илгээх",
    id: "Kirim Penjualan Mendesak",
  },
};

export const KOREAN_LABELS: Record<string, string> = {
  reservation_request: "예약 신청",
  sell_request: "판매 신청",
  urgent_sell_request: "긴급 판매 신청",
  reservation_submit: "예약 신청하기",
  urgent_sell_submit: "긴급 판매 신청하기",
};

export function getLabel(key: string, lang: string): string {
  const ko = KOREAN_LABELS[key] ?? key;
  const translated = UI_TRANSLATIONS[key]?.[lang];

  if (!lang || lang === "ko" || !translated) {
    return ko;
  }

  return `${ko} (${translated})`;
}
