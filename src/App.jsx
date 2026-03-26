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
  const userEmail = session?.user?.email;

  // Strict Admin Check - for routing protection
  const isAdmin = isAuth && userEmail === 'admin@denr.gov.ph';

  return (
    <Router>
      <Routes>
        {/* Public / Landing */}
        <Route 
          path="/" 
          element={!isAuth ? <Login /> : (isAdmin ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/selection" replace />)} 
        />

        {/* Employee Routes */}
        <Route path="/selection" element={isAuth ? <Selection /> : <Navigate to="/" replace />} />
        <Route path="/forms/leave" element={isAuth ? <LeaveForm /> : <Navigate to="/" replace />} />
        <Route path="/forms/travel" element={isAuth ? <TravelForm /> : <Navigate to="/" replace />} />
        <Route path="/success" element={isAuth ? <FormSuccessful /> : <Navigate to="/" replace />} />

        {/* Admin Routes - Strictly protected */}
        <Route path="/admin/dashboard" element={isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />} />
        <Route path="/admin/approved" element={isAdmin ? <ApprovedForms /> : <Navigate to="/" replace />} />
        <Route path="/admin/archive" element={isAdmin ? <Archive /> : <Navigate to="/" replace />} />
        <Route path="/admin/monthly-summary" element={isAdmin ? <MonthlySummary /> : <Navigate to="/" replace />} />
        <Route path="/admin/account-management" element={isAdmin ? <AccountManagement /> : <Navigate to="/" replace />} />
        <Route path="/admin/records" element={isAdmin ? <Records /> : <Navigate to="/" replace />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;