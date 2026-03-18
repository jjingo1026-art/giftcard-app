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
import CustomerChat from "./pages/CustomerChat";
import Notice from "./pages/Notice";
import Terms from "./pages/Terms";
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
      <Route path="/staff/dashboard" component={StaffDashboard} />
      <Route path="/staff/dashboard.html" component={StaffDashboard} />
      <Route path="/staff/detail" component={StaffDetail} />
      <Route path="/staff/detail.html" component={StaffDetail} />
      <Route path="/staff/chat" component={StaffDetail} />
      <Route path="/staff/chat.html" component={StaffDetail} />
      <Route path="/notice" component={Notice} />
      <Route path="/notice.html" component={Notice} />
      <Route path="/terms" component={Terms} />
      <Route path="/terms.html" component={Terms} />
      <Route path="/chat" component={CustomerChat} />
      <Route path="/chat.html" component={CustomerChat} />
      <Route path="/staff/login" component={StaffLogin} />
      <Route path="/staff/login.html" component={StaffLogin} />
      <Route path="/staff/register" component={StaffRegister} />
      <Route path="/staff/register.html" component={StaffRegister} />
      <Route component={App} />
    </Switch>
  </Router>
);
