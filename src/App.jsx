import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';

import Login from './pages/Login';
import Selection from './pages/Selection';
import LeaveForm from './pages/LeaveForm';
import TravelForm from './pages/TravelForm';
import FormSuccessful from './pages/FormSuccessful';

import AdminDashboard from './pages/AdminDashboard';
import ApprovedForms from './pages/ApprovedForms';
import Archive from './pages/Archive';
import MonthlySummary from './pages/MonthlySummary';
import AccountManagement from './pages/AccountManagement';
import Records from './pages/Records';

function App() {
  const [session, setSession] = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0fdf8] to-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent"></div>
          <p className="text-slate-400 text-sm font-medium">Loading LeaveGo...</p>
        </div>
      </div>
    );
  }

  const isAuth = !!session;

  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/" element={!isAuth ? <Login /> : <Navigate to="/selection" replace />} />

        {/* Employee Routes */}
        <Route path="/selection" element={isAuth ? <Selection /> : <Navigate to="/" replace />} />
        <Route path="/forms/leave" element={isAuth ? <LeaveForm /> : <Navigate to="/" replace />} />
        <Route path="/forms/travel" element={isAuth ? <TravelForm /> : <Navigate to="/" replace />} />
        <Route path="/success" element={isAuth ? <FormSuccessful /> : <Navigate to="/" replace />} />

        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={isAuth ? <AdminDashboard /> : <Navigate to="/" replace />} />
        <Route path="/admin/approved" element={isAuth ? <ApprovedForms /> : <Navigate to="/" replace />} />
        <Route path="/admin/archive" element={isAuth ? <Archive /> : <Navigate to="/" replace />} />
        <Route path="/admin/monthly-summary" element={isAuth ? <MonthlySummary /> : <Navigate to="/" replace />} />
        <Route path="/admin/account-management" element={isAuth ? <AccountManagement /> : <Navigate to="/" replace />} />
        <Route path="/admin/records" element={isAuth ? <Records /> : <Navigate to="/" replace />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
