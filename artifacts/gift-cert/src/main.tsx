import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Router, Route, Switch } from "wouter";
import { attachAudioUnlock } from "./lib/notificationSound";
import "./index.css";

// 즉시 로드 (홈/시세 페이지 — 방문자가 가장 먼저 보는 화면)
import GiftCertTypeSelect from "./pages/GiftCertTypeSelect";
import App from "./App";

// 지연 로드 — 고객 플로우
const MobileGiftCert      = lazy(() => import("./pages/MobileGiftCert"));
const MobileTerms         = lazy(() => import("./pages/MobileTerms"));
const MobilePrivacy       = lazy(() => import("./pages/MobilePrivacy"));
const MobileSelect        = lazy(() => import("./pages/MobileSelect"));
const MobileCheck         = lazy(() => import("./pages/MobileCheck"));
const MobileBusinessInfo  = lazy(() => import("./pages/MobileBusinessInfo"));
const CustomerChat        = lazy(() => import("./pages/CustomerChat"));
const ReservationCheck    = lazy(() => import("./pages/ReservationCheck"));
const ReservationEdit     = lazy(() => import("./pages/ReservationEdit"));
const Notice              = lazy(() => import("./pages/Notice"));
const Terms               = lazy(() => import("./pages/Terms"));
const Privacy             = lazy(() => import("./pages/Privacy"));
const BusinessInfo        = lazy(() => import("./pages/BusinessInfo"));

// 지연 로드 — 관리자
const AdminLogin          = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard      = lazy(() => import("./pages/AdminDashboard"));
const AdminDetail         = lazy(() => import("./pages/AdminDetail"));
const AdminStaffView      = lazy(() => import("./pages/AdminStaffView"));
const AdminChat           = lazy(() => import("./pages/AdminChat"));
const AdminTodayRevenue   = lazy(() => import("./pages/AdminTodayRevenue"));
const AdminWeeklyRevenue  = lazy(() => import("./pages/AdminWeeklyRevenue"));
const AdminRevenue        = lazy(() => import("./pages/AdminRevenue"));
const AdminAllReservations= lazy(() => import("./pages/AdminAllReservations"));
const AdminAssign         = lazy(() => import("./pages/AdminAssign"));
const AdminSettings       = lazy(() => import("./pages/AdminSettings"));
const AdminSiteSettings   = lazy(() => import("./pages/AdminSiteSettings"));
const AdminChatList       = lazy(() => import("./pages/AdminChatList"));
const AdminStaffOverview  = lazy(() => import("./pages/AdminStaffOverview"));
const AdminNoShow         = lazy(() => import("./pages/AdminNoShow"));
const AdminMobileDashboard= lazy(() => import("./pages/AdminMobileDashboard"));
const AdminMobileRevenue  = lazy(() => import("./pages/AdminMobileRevenue"));
const StaffApprove        = lazy(() => import("./pages/StaffApprove"));

// 지연 로드 — 담당자
const StaffLogin          = lazy(() => import("./pages/StaffLogin"));
const StaffRegister       = lazy(() => import("./pages/StaffRegister"));
const StaffDashboard      = lazy(() => import("./pages/StaffDashboard"));
const StaffDetail         = lazy(() => import("./pages/StaffDetail"));
const StaffCard           = lazy(() => import("./pages/StaffCard"));
const StaffChatList       = lazy(() => import("./pages/StaffChatList"));

attachAudioUnlock();

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

const Fallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
  </div>
);

createRoot(document.getElementById("root")!).render(
  <Router base={base}>
    <Suspense fallback={<Fallback />}>
      <Switch>
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/login.html" component={AdminLogin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/dashboard.html" component={AdminDashboard} />
        <Route path="/admin/detail/:id" component={AdminDetail} />
        <Route path="/admin/detail.html" component={AdminDetail} />
        <Route path="/admin/staff/approve" component={StaffApprove} />
        <Route path="/admin/staff/approve.html" component={StaffApprove} />
        <Route path="/admin/staff/view" component={AdminStaffView} />
        <Route path="/admin/staff/view.html" component={AdminStaffView} />
        <Route path="/admin/chat" component={AdminChat} />
        <Route path="/admin/chat.html" component={AdminChat} />
        <Route path="/admin/today-revenue" component={AdminTodayRevenue} />
        <Route path="/admin/today-revenue.html" component={AdminTodayRevenue} />
        <Route path="/admin/weekly-revenue" component={AdminWeeklyRevenue} />
        <Route path="/admin/weekly-revenue.html" component={AdminWeeklyRevenue} />
        <Route path="/admin/revenue" component={AdminRevenue} />
        <Route path="/admin/revenue.html" component={AdminRevenue} />
        <Route path="/admin/all-reservations" component={AdminAllReservations} />
        <Route path="/admin/all-reservations.html" component={AdminAllReservations} />
        <Route path="/admin/assign" component={AdminAssign} />
        <Route path="/admin/assign.html" component={AdminAssign} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/settings.html" component={AdminSettings} />
        <Route path="/admin/site-settings" component={AdminSiteSettings} />
        <Route path="/admin/site-settings.html" component={AdminSiteSettings} />
        <Route path="/admin/chats" component={AdminChatList} />
        <Route path="/admin/chats.html" component={AdminChatList} />
        <Route path="/admin/staff-overview" component={AdminStaffOverview} />
        <Route path="/admin/staff-overview.html" component={AdminStaffOverview} />
        <Route path="/admin/noshow" component={AdminNoShow} />
        <Route path="/admin/noshow.html" component={AdminNoShow} />
        <Route path="/admin/mobile" component={AdminMobileDashboard} />
        <Route path="/admin/mobile.html" component={AdminMobileDashboard} />
        <Route path="/admin/mobile/revenue" component={AdminMobileRevenue} />
        <Route path="/admin/mobile/revenue.html" component={AdminMobileRevenue} />
        <Route path="/staff/dashboard" component={StaffDashboard} />
        <Route path="/staff/dashboard.html" component={StaffDashboard} />
        <Route path="/staff/card" component={StaffCard} />
        <Route path="/staff/card.html" component={StaffCard} />
        <Route path="/staff/detail" component={StaffDetail} />
        <Route path="/staff/detail.html" component={StaffDetail} />
        <Route path="/staff/chat" component={StaffDetail} />
        <Route path="/staff/chat.html" component={StaffDetail} />
        <Route path="/notice" component={Notice} />
        <Route path="/notice.html" component={Notice} />
        <Route path="/terms" component={Terms} />
        <Route path="/terms.html" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/privacy.html" component={Privacy} />
        <Route path="/chat" component={CustomerChat} />
        <Route path="/chat.html" component={CustomerChat} />
        <Route path="/check" component={ReservationCheck} />
        <Route path="/check.html" component={ReservationCheck} />
        <Route path="/edit" component={ReservationEdit} />
        <Route path="/edit.html" component={ReservationEdit} />
        <Route path="/business" component={BusinessInfo} />
        <Route path="/business.html" component={BusinessInfo} />
        <Route path="/staff/login" component={StaffLogin} />
        <Route path="/staff/login.html" component={StaffLogin} />
        <Route path="/staff/register" component={StaffRegister} />
        <Route path="/staff/register.html" component={StaffRegister} />
        <Route path="/staff/chats" component={StaffChatList} />
        <Route path="/staff/chats.html" component={StaffChatList} />
        <Route path="/mobile" component={MobileGiftCert} />
        <Route path="/mobile.html" component={MobileGiftCert} />
        <Route path="/mobile/terms" component={MobileTerms} />
        <Route path="/mobile/privacy" component={MobilePrivacy} />
        <Route path="/mobile/select" component={MobileSelect} />
        <Route path="/mobile/check" component={MobileCheck} />
        <Route path="/mobile/business" component={MobileBusinessInfo} />
        <Route path="/rates" component={App} />
        <Route path="/rates.html" component={App} />
        <Route path="/" component={GiftCertTypeSelect} />
        <Route component={GiftCertTypeSelect} />
      </Switch>
    </Suspense>
  </Router>
);
