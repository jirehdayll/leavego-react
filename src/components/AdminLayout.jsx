import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import {
  LayoutDashboard, CheckSquare, Archive, CalendarDays,
  Users, BookOpen, LogOut, ChevronLeft, ChevronRight, Menu, X, Camera
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import QRScanner from './QRScanner';

const navItems = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'QR Scanner', path: '#qr-scanner', icon: Camera, action: 'qr-scanner' },
  { label: 'Approved Forms', path: '/admin/approved', icon: CheckSquare },
  { label: 'Archive', path: '/admin/archive', icon: Archive },
  { label: 'Monthly Summary', path: '/admin/monthly-summary', icon: CalendarDays },
  { label: 'Account Management', path: '/admin/account-management', icon: Users },
  { label: 'Records', path: '/admin/records', icon: BookOpen },
];

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const adminEmail = user?.email || '—';

  if (authLoading) return null; // or a smaller spinner

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-screen">
      {/* Brand Header - Fixed */}
      <div className={`flex items-center gap-3 px-5 py-5 border-b border-white/10 flex-shrink-0 ${collapsed ? 'justify-center' : ''}`}>
        <img src="/logo.png" alt="LeaveGo" className="w-9 h-9 object-contain flex-shrink-0" />
        {!collapsed && (
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">LeaveGo</h1>
            <p className="text-emerald-300 text-xs">Admin Panel</p>
          </div>
        )}
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto min-h-0">
        {navItems.map(({ label, path, icon: Icon, action }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => { 
                if (action === 'qr-scanner') {
                  setShowQRScanner(true);
                  setMobileOpen(false);
                } else {
                  navigate(path); 
                  setMobileOpen(false);
                }
              }}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                ${active
                  ? 'bg-white/15 text-white shadow-lg shadow-black/20'
                  : 'text-emerald-100/70 hover:bg-white/10 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon className={`flex-shrink-0 w-5 h-5 transition-colors ${active ? 'text-emerald-300' : 'text-emerald-100/50 group-hover:text-emerald-300'}`} />
              {!collapsed && <span>{label}</span>}
              {!collapsed && active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
            </button>
          );
        })}
      </nav>

      {/* User Info & Logout - Fixed at Bottom */}
      <div className="flex-shrink-0 border-t border-white/10">
        {/* Account Section */}
        {!collapsed && (
          <div className="px-3 py-3">
            <div className="px-3 py-3 rounded-xl bg-white/5 mb-3">
              <p className="text-xs text-emerald-300 font-medium truncate">{adminEmail}</p>
              <p className="text-xs text-emerald-100/40 mt-1">Administrator</p>
            </div>
          </div>
        )}
        
        {/* Logout Button - Always Visible */}
        <div className="px-3 py-4">
          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-300/70 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="flex-shrink-0 w-5 h-5" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        </div>
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 sm:w-72 bg-gradient-to-b from-[#1a3530] to-[#0f211d] shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-gradient-to-b from-[#1a3530] to-[#0f211d] shadow-2xl transition-all duration-300 ease-in-out relative flex-shrink-0 ${collapsed ? 'w-14 sm:w-16' : 'w-56 sm:w-64'}`}>
        {/* Static Header */}
        <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-4 sm:py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
          <img src="/logo.png" alt="LeaveGo" className="w-7 h-7 sm:w-9 sm:h-9 object-contain flex-shrink-0" />
          {!collapsed && (
            <div>
              <h1 className="text-white font-bold text-xs sm:text-sm leading-tight">LeaveGo</h1>
              <p className="text-emerald-300 text-[10px] sm:text-xs">Admin Panel</p>
            </div>
          )}
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 px-2 sm:px-3 py-3 sm:py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ label, path, icon: Icon, action }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => { 
                  if (action === 'qr-scanner') {
                    setShowQRScanner(true);
                    setMobileOpen(false);
                  } else {
                    navigate(path); 
                    setMobileOpen(false);
                  }
                }}
                title={collapsed ? label : undefined}
                className={`w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 group
                  ${active
                    ? 'bg-white/15 text-white shadow-lg shadow-black/20'
                    : 'text-emerald-100/70 hover:bg-white/10 hover:text-white'
                  } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon className={`flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 transition-colors ${active ? 'text-emerald-300' : 'text-emerald-100/50 group-hover:text-emerald-300'}`} />
                {!collapsed && <span className="truncate">{label}</span>}
                {!collapsed && active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
              </button>
            );
          })}
        </nav>

        {/* Static Footer - User Info & Logout */}
        <div className="px-2 sm:px-3 pt-3 sm:pt-4 pb-3 sm:pb-4 border-t border-white/10">
          {!collapsed && (
            <div className="px-2 sm:px-3 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 mb-2 sm:mb-3">
              <p className="text-[10px] sm:text-xs text-emerald-300 font-medium truncate">{adminEmail}</p>
              <p className="text-[9px] sm:text-xs text-emerald-100/40 mt-1">Administrator</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className={`w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium text-red-300/70 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-16 sm:top-20 bg-[#29423c] border border-emerald-800/50 text-emerald-300 rounded-full p-1 sm:p-1.5 shadow-lg hover:bg-[#314e47] transition-all z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Topbar */}
        <header className="lg:hidden flex items-center justify-between gap-4 px-3 sm:px-4 py-2 sm:py-3 bg-[#1a3530] shadow-md flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <img src="/logo.png" alt="LeaveGo" className="w-6 h-6 sm:w-7 sm:h-7 object-contain" />
            <span className="text-white font-bold text-sm sm:text-base">LeaveGo Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQRScanner(true)}
              className="text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="QR Scanner"
            >
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* QR Scanner Modal */}
      <QRScanner 
        isOpen={showQRScanner} 
        onClose={() => setShowQRScanner(false)} 
      />
    </div>
  );
}
