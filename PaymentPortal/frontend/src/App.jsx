import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Splash from "./pages/Splash";
import NewPayment from "./pages/NewPayment";
import PaymentsList from "./pages/PaymentsList";
import PaymentAuth from "./pages/PaymentAuth";
import PaymentSummary from "./pages/PaymentSummary";
import RequireAuth from "./components/RequireAuth";
import Beneficiaries from "./pages/Beneficiaries";
import ProfileSettings from "./pages/ProfileSettings";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Staff/Admin
import { RequireStaff, RequireAdmin } from "./routes/guards";
import StaffLogin from "./pages/staff/StaffLogin";
import StaffLayout from "./pages/staff/StaffLayout";
import StaffQueue from "./pages/staff/StaffQueue";
import StaffPayment from "./pages/staff/StaffPayment";
import AdminUsers from "./pages/staff/AdminUsers";
import AdminUserDetail from "./pages/staff/AdminUserDetail";

// Shared topbar for customer/public
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <main>
      {/* Customer/public topbar */}
     

      <Routes>
        {/* Customer/public */}
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* public password recovery */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* protected customer pages */}
        <Route path="/welcome" element={<RequireAuth><Splash /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><ProfileSettings /></RequireAuth>} />
        <Route path="/pay/new" element={<RequireAuth><NewPayment /></RequireAuth>} />
        <Route path="/payments" element={<RequireAuth><PaymentsList /></RequireAuth>} />
        <Route path="/pay/auth/:id" element={<RequireAuth><PaymentAuth /></RequireAuth>} />
        <Route path="/payments/:id/summary" element={<RequireAuth><PaymentSummary /></RequireAuth>} />
        <Route path="/beneficiaries" element={<RequireAuth><Beneficiaries /></RequireAuth>} />

        {/* Staff/Admin area (has its own StaffLayout topbar) */}
        <Route path="/staff/login" element={<StaffLogin />} />
        <Route path="/staff" element={<RequireStaff><StaffLayout /></RequireStaff>}>
          <Route index element={<StaffQueue />} />
          <Route path="payments/:id" element={<StaffPayment />} />
          <Route path="users" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
          <Route path="users/:id" element={<RequireAdmin><AdminUserDetail /></RequireAdmin>} />
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}
