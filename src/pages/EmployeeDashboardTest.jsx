import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function EmployeeDashboardTest() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simple test to see if component renders
    console.log('User:', user?.email);
    if (user?.email) {
      setLoading(false);
    }
  }, [user?.email]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0fdf8] to-white p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Employee Dashboard</h1>
        <p className="text-slate-600">Welcome, {user?.email || 'User'}!</p>
        <p className="text-sm text-slate-500 mt-2">Dashboard is working!</p>
      </div>
    </div>
  );
}
