import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import {
  LayoutDashboard, CheckSquare, Archive, CalendarDays,
  Users, BookOpen, LogOut, ChevronLeft, ChevronRight, Menu, X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
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

  const { user, loading: authLoading } = useAuth();
  const adminEmail = user?.email || 'admin@denr.gov.ph';

  if (authLoading) return null; // or a smaller spinner

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className={`flex items-center gap-3 px-5 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
        <img src="/logo.png" alt="LeaveGo" className="w-9 h-9 object-contain flex-shrink-0" />
        {!collapsed && (
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">LeaveGo</h1>
            <p className="text-emerald-300 text-xs">Admin Panel</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ label, path, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => { navigate(path); setMobileOpen(false); }}
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

      {/* User Info & Logout */}
      <div className="px-3 pb-4 border-t border-white/10 pt-4">
        {!collapsed && (
          <div className="px-3 py-2 mb-2 rounded-xl bg-white/5">
            <p className="text-xs text-emerald-300 font-medium truncate">{adminEmail}</p>
            <p className="text-xs text-emerald-100/40 mt-0.5">Administrator</p>
          </div>
        )}
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
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-[#1a3530] to-[#0f211d] shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-white/60 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-gradient-to-b from-[#1a3530] to-[#0f211d] shadow-2xl transition-all duration-300 ease-in-out relative flex-shrink-0 ${collapsed ? 'w-16' : 'w-64'}`}>
        <SidebarContent />
        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 bg-[#29423c] border border-emerald-800/50 text-emerald-300 rounded-full p-1 shadow-lg hover:bg-[#314e47] transition-all z-10"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Topbar */}
        <header className="lg:hidden flex items-center gap-4 px-4 py-3 bg-[#1a3530] shadow-md">
          <button onClick={() => setMobileOpen(true)} className="text-white">
            <Menu className="w-6 h-6" />
          </button>
          <img src="/logo.png" alt="LeaveGo" className="w-7 h-7 object-contain" />
          <span className="text-white font-bold text-sm">LeaveGo Admin</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
