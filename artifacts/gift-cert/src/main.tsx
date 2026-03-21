import { createRoot } from "react-dom/client";
import { Router, Route, Switch } from "wouter";
import App from "./App";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminDetail from "./pages/AdminDetail";
import StaffRegister from "./pages/StaffRegister";
import StaffLogin from "./pages/StaffLogin";
import StaffApprove from "./pages/StaffApprove";
import StaffDashboard from "./pages/StaffDashboard";
import StaffDetail from "./pages/StaffDetail";
import StaffCard from "./pages/StaffCard";
import CustomerChat from "./pages/CustomerChat";
import Notice from "./pages/Notice";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import ReservationCheck from "./pages/ReservationCheck";
import ReservationEdit from "./pages/ReservationEdit";
import AdminStaffView from "./pages/AdminStaffView";
import AdminChat from "./pages/AdminChat";
import AdminTodayRevenue from "./pages/AdminTodayRevenue";
import AdminWeeklyRevenue from "./pages/AdminWeeklyRevenue";
import AdminRevenue from "./pages/AdminRevenue";
import AdminAllReservations from "./pages/AdminAllReservations";
import AdminAssign from "./pages/AdminAssign";
import AdminSettings from "./pages/AdminSettings";
import AdminSiteSettings from "./pages/AdminSiteSettings";
import AdminChatList from "./pages/AdminChatList";
import AdminStaffOverview from "./pages/AdminStaffOverview";
import StaffChatList from "./pages/StaffChatList";
import BusinessInfo from "./pages/BusinessInfo";
import "./index.css";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

createRoot(document.getElementById("root")!).render(
  <Router base={base}>
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
      <Route component={App} />
    </Switch>
  </Router>
);
