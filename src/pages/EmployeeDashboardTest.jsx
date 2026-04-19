import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.ts';
import QRCode from 'qrcode.react';
import { leaveRequestsAPI } from '../api/leaveRequests';
import { REQUEST_STATUS, REQUEST_TYPES } from '../constants';
import { QrCode, FileText, Plane, LogOut, Clock, CheckCircle2, XCircle } from 'lucide-react';

export default function EmployeeDashboardTest() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [applicationStats, setApplicationStats] = useState({
    pending: 0,
    approved: 0,
    declined: 0,
    total: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    if (user?.email) {
      setLoading(false);
      fetchApplicationStats();
    }
  }, [user?.email]);

  const fetchApplicationStats = async () => {
    if (!user?.id) return;
    
    setStatsLoading(true);
    try {
      // Fetch user's application counts with strict isolation
      const [pendingResult, approvedResult, declinedResult, totalResult] = await Promise.all([
        leaveRequestsAPI.getCount({ user_id: user.id, status: REQUEST_STATUS.PENDING, is_archived: false }),
        leaveRequestsAPI.getCount({ user_id: user.id, status: REQUEST_STATUS.APPROVED, is_archived: false }),
        leaveRequestsAPI.getCount({ user_id: user.id, status: REQUEST_STATUS.DECLINED, is_archived: false }),
        leaveRequestsAPI.getCount({ user_id: user.id, is_archived: false })
      ]);

      setApplicationStats({
        pending: pendingResult.count || 0,
        approved: approvedResult.count || 0,
        declined: declinedResult.count || 0,
        total: totalResult.count || 0
      });
    } catch (error) {
      console.error('Error fetching application stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

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

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0fdf8] to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-slate-800">LeaveGo Portal</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                {user?.user_metadata?.full_name || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">
            Welcome back, {user?.user_metadata?.full_name || user?.email}!
          </h2>
          <p className="text-slate-600">
            {user?.user_metadata?.position || 'Employee'} • {user?.user_metadata?.department || 'Department'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* QR Code Section - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Your Employee ID</h3>
                  <p className="text-sm text-slate-500">Scan for instant profile verification</p>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* QR Code */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className="w-48 h-48 bg-white p-4 rounded-xl shadow-lg border-2 border-emerald-200">
                      {user?.id && (
                        <QRCode
                          value={`${window.location.origin}/profile/view/${user.id}`}
                          size={160}
                          level="H"
                          includeMargin={true}
                          bgColor="#ffffff"
                          fgColor="#047857"
                        />
                      )}
                    </div>
                    <div className="absolute -bottom-2 left-0 right-0 text-center">
                      <span className="bg-emerald-700 text-white text-xs px-3 py-1 rounded-full">
                        Employee QR ID
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* User Info */}
                <div className="flex-1 text-center md:text-left">
                  <h4 className="text-xl font-semibold text-slate-800 mb-2">
                    {user?.user_metadata?.full_name || 'Employee Name'}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="text-sm font-medium text-slate-500">Position:</span>
                      <span className="text-sm text-slate-700">{user?.user_metadata?.position || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="text-sm font-medium text-slate-500">Department:</span>
                      <span className="text-sm text-slate-700">{user?.user_metadata?.department || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <span className="text-sm font-medium text-slate-500">Email:</span>
                      <span className="text-sm text-slate-700">{user?.email || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
                    <p className="text-xs text-emerald-700">
                      <strong>Security Notice:</strong> This QR code contains your unique employee identifier. Only authorized administrators can scan and access your profile information.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Application Statistics */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Your Applications</h3>
              
              {statsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-12 bg-slate-100 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-slate-700">Pending</span>
                    </div>
                    <span className="text-lg font-bold text-amber-600">{applicationStats.pending}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-medium text-slate-700">Approved</span>
                    </div>
                    <span className="text-lg font-bold text-emerald-600">{applicationStats.approved}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-slate-700">Declined</span>
                    </div>
                    <span className="text-lg font-bold text-red-600">{applicationStats.declined}</span>
                  </div>
                  
                  <div className="pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Total Applications</span>
                      <span className="text-xl font-bold text-slate-800">{applicationStats.total}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Leave Form */}
          <a
            href="/forms/leave"
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-emerald-300 transition-all group"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition-colors">
                <FileText className="w-6 h-6 text-emerald-700" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">Leave Form</h3>
              <p className="text-sm text-slate-500">File leave request</p>
            </div>
          </a>

          {/* Travel Form */}
          <a
            href="/forms/travel"
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-emerald-300 transition-all group"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition-colors">
                <Plane className="w-6 h-6 text-emerald-700" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">Travel Order</h3>
              <p className="text-sm text-slate-500">Request travel order</p>
            </div>
          </a>

          {/* Status Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-blue-700" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">My Requests</h3>
              <p className="text-sm text-slate-500">{applicationStats.total} total applications</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <p className="text-emerald-700 text-sm">
            ✅ Employee dashboard with automatic QR code generation and real-time application statistics is now active!
          </p>
        </div>
      </div>
    </div>
  );
}
