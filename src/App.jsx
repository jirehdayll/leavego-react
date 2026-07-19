import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import PasswordReset from './pages/PasswordReset';
import EmployeeDashboard from './pages/EmployeeDashboard';
import LeaveForm from './pages/LeaveForm';
import TravelForm from './pages/TravelForm';
import FormSuccessful from './pages/FormSuccessful';

import AdminDashboard from './pages/AdminDashboard';
import ApprovedForms from './pages/ApprovedForms';
import Archive from './pages/Archive';
import MonthlySummary from './pages/MonthlySummary';
import AccountManagement from './pages/AccountManagement';
import Records from './pages/Records';
import ScannedProfileView from './pages/ScannedProfileView';
import LeaveBalanceDebug from './pages/LeaveBalanceDebug';

import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import { APP_ROUTES } from './constants';
import { useHistoryBlockerWithSessionCheck } from './hooks/useHistoryBlocker';
import { LeaveBalanceProvider } from './contexts/LeaveBalanceContext';

// Enhanced Navigation Blocker with Session Validation
function NavigationBlocker() {
  const { user, loading, hasSession } = useAuth();
  
  // Use the enhanced history blocker for admin users
  useHistoryBlockerWithSessionCheck();

  useEffect(() => {
    if (loading || !user) return;

    // Basic history blocking for all users
    // This push creates a barrier that makes back button ineffective
    window.history.pushState(null, '', window.location.href);

    const blockNav = (e) => {
      // Validate session on back button attempt
      if (!hasSession) {
        // Session expired, redirect to login
        window.location.href = '/login';
        return;
      }
      // Push another state to re-block the back button
      window.history.pushState(null, '', window.location.href);
    };

    window.addEventListener('popstate', blockNav);
    return () => window.removeEventListener('popstate', blockNav);
  }, [user, loading, hasSession]);

  return null;
}

function App() {
  const { user, loading, hasSession } = useAuth();

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

  return (
    <LeaveBalanceProvider>
      <Router>
        <NavigationBlocker />
        <Routes>
          {/* Public / Landing - Show login if not authenticated, dashboard if authenticated */}
          <Route 
            path={APP_ROUTES.ROOT} 
            element={!hasSession ? <Login /> : <Navigate to="/dashboard" replace />} 
          />

          {/* Login route - Only show if not authenticated */}
          <Route path={APP_ROUTES.LOGIN} element={!hasSession ? <Login /> : <Navigate to="/dashboard" replace />} />

          {/* Password recovery from email (public) */}
          <Route path={APP_ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
          
          {/* Dedicated password reset page (public) */}
          <Route path={APP_ROUTES.PASSWORD_RESET} element={<PasswordReset />} />

          {/* Employee Routes - Protected */}
          <Route path="/dashboard" element={<ProtectedRoute><EmployeeDashboard /></ProtectedRoute>} />
          <Route path="/forms/leave" element={<ProtectedRoute><LeaveForm /></ProtectedRoute>} />
          <Route path="/forms/travel" element={<ProtectedRoute><TravelForm /></ProtectedRoute>} />
          <Route path="/success" element={<ProtectedRoute><FormSuccessful /></ProtectedRoute>} />
          <Route path="/debug/balance" element={<ProtectedRoute><LeaveBalanceDebug /></ProtectedRoute>} />

          {/* Admin Routes - Protected and require admin role */}
          <Route path={APP_ROUTES.ADMIN_DASHBOARD} element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/approved" element={<AdminRoute><ApprovedForms /></AdminRoute>} />
          <Route path="/admin/archive" element={<AdminRoute><Archive /></AdminRoute>} />
          <Route path="/admin/monthly-summary" element={<AdminRoute><MonthlySummary /></AdminRoute>} />
          <Route path="/admin/account-management" element={<AdminRoute><AccountManagement /></AdminRoute>} />
          <Route path="/admin/records" element={<AdminRoute><Records /></AdminRoute>} />
          <Route path="/admin/debug/balance" element={<AdminRoute><LeaveBalanceDebug /></AdminRoute>} />
          <Route path="/debug/balance" element={<ProtectedRoute><LeaveBalanceDebug /></ProtectedRoute>} />
          <Route path="/profile/view/:id" element={<ScannedProfileView />} />

          <Route path="*" element={<Navigate to={!hasSession ? APP_ROUTES.LOGIN : "/dashboard"} replace />} />
        </Routes>
      </Router>
    </LeaveBalanceProvider>
  );
}

export default App;