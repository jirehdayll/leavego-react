import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';

import Login from './pages/Login';
import Selection from './pages/Selection';
import LeaveForm from './pages/LeaveForm';
import TravelForm from './pages/TravelForm';
import FormSuccessful from './pages/FormSuccessful';
import DebugConnection from './pages/DebugConnection';
import SimpleTestForm from './pages/SimpleTestForm';
import LiveTestForm from './pages/LiveTestForm';
import FullWorkflowTest from './pages/FullWorkflowTest';
import RealUserTest from './pages/RealUserTest';

import AdminDashboard from './pages/AdminDashboard';
import ApprovedForms from './pages/ApprovedForms';
import Archive from './pages/Archive';
import MonthlySummary from './pages/MonthlySummary';
import AccountManagement from './pages/AccountManagement';
import Records from './pages/Records';

import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';

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
        {/* Public / Landing - Only show login if no session */}
        <Route 
          path="/" 
          element={!isAuth ? <Login /> : <Navigate to="/login" replace />} 
        />

        {/* Login route - for explicit login access */}
        <Route path="/login" element={<Login />} />

        {/* Employee Routes - Protected by ProtectedRoute component */}
        <Route path="/selection" element={<ProtectedRoute><Selection /></ProtectedRoute>} />
        <Route path="/forms/leave" element={<ProtectedRoute><LeaveForm /></ProtectedRoute>} />
        <Route path="/forms/travel" element={<ProtectedRoute><TravelForm /></ProtectedRoute>} />
        <Route path="/success" element={<ProtectedRoute><FormSuccessful /></ProtectedRoute>} />

        {/* Admin Routes - Strictly protected */}
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/approved" element={<AdminRoute><ApprovedForms /></AdminRoute>} />
        {/* Debug Route */}
        <Route path="/debug" element={<DebugConnection />} />
        <Route path="/test" element={<SimpleTestForm />} />
        <Route path="/live" element={<LiveTestForm />} />
        <Route path="/workflow" element={<FullWorkflowTest />} />
        <Route path="/realtest" element={<RealUserTest />} />
        <Route path="/admin/archive" element={<AdminRoute><Archive /></AdminRoute>} />
        <Route path="/admin/monthly-summary" element={<AdminRoute><MonthlySummary /></AdminRoute>} />
        <Route path="/admin/account-management" element={<AdminRoute><AccountManagement /></AdminRoute>} />
        <Route path="/admin/records" element={<AdminRoute><Records /></AdminRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;