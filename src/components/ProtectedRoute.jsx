import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading, isActive, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user is not active, redirect to login (Login component will handle the modal)
  if (!isActive) {
    return <Navigate to="/login" replace />;
  }

  // If admin is required but user is not admin
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/selection" replace />;
  }

  return children;
}

export function AdminRoute({ children }) {
  return <ProtectedRoute requireAdmin={true}>{children}</ProtectedRoute>;
}
