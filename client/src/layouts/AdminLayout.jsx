// src/layouts/AdminLayout.jsx
import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  RotateCw,
  Bell,
  LayoutDashboard,
  Users,
  Layers,
  TrendingUp,
  HelpCircle,
  LogOut,
  List,
} from "lucide-react";
import useAuthStore from "../store/useAuthStore";
import LogoutModal from "../components/LogoutModal";

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const username = user?.username || "Admin User";
  const displayInitial = username.charAt(0).toUpperCase();

  const handleLogout = async () => {
    setIsLogoutModalOpen(false);
    await logout();
    navigate("/");
  };

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-2 px-2 h-8 rounded-[var(--radius-md)] transition-colors text-[14px] ${
      isActive
        ? "bg-[var(--bg-raised)] text-[var(--text-primary)] font-medium"
        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)]"
    }`;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
      {/* --- Left Sidebar --- */}
      <aside className="w-[220px] flex flex-col" style={{ background: 'var(--bg-canvas)' }}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[var(--accent)] flex items-center justify-center mr-2">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span className="font-medium text-[var(--text-primary)] text-[15px] tracking-[-0.01em]">
            Ascend <span className="text-[var(--accent)] font-medium">Ops</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          <p className="px-2 text-[11px] font-medium tracking-wide text-[var(--text-tertiary)] mb-2 mt-1">
            Management
          </p>
          <NavLink to="/admin" end className={navItemClass}>
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </NavLink>
          <NavLink to="/admin/users" className={navItemClass}>
            <Users className="w-4 h-4" /> Users
          </NavLink>
          <NavLink to="/admin/skills" className={navItemClass}>
            <Layers className="w-4 h-4" /> Skills
          </NavLink>

          <p className="px-2 text-[11px] font-medium tracking-wide text-[var(--text-tertiary)] mt-4 mb-2">
            Data architecture
          </p>
          <NavLink to="/admin/market" className={navItemClass}>
            <TrendingUp className="w-4 h-4" /> Market
          </NavLink>
          <NavLink to="/admin/questions" className={navItemClass}>
            <HelpCircle className="w-4 h-4" /> Seed questions
          </NavLink>
          <NavLink to="/admin/questions/viewer" className={navItemClass}>
            <List className="w-4 h-4" /> View questions
          </NavLink>
        </nav>

        {/* Logout */}
        <div className="px-3 mb-4 border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full flex items-center gap-2 px-3 h-9 rounded-[var(--radius-md)] border text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors font-medium text-[13px]"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-14 flex items-center justify-between px-6 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-canvas)' }}>
          <div className="flex items-center gap-4 text-[var(--text-secondary)] text-[14px] font-medium">
            Overview
          </div>

          <div className="flex items-center gap-3">
            {/* Sync */}
            <button className="flex items-center gap-2 px-3 h-9 rounded-[var(--radius-md)] border text-[var(--text-secondary)] text-[13px] font-medium hover:bg-[var(--bg-raised)] transition-colors group" style={{ borderColor: 'var(--border-base)' }}>
              <RotateCw className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors" />
              Sync
            </button>

            {/* Bell */}
            <button className="relative w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[var(--danger)] rounded-full"></span>
            </button>

            {/* User */}
            <div className="flex items-center gap-2 pl-3 border-l ml-1" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="text-right hidden xl:block mr-1">
                <p className="text-[13px] font-medium text-[var(--text-primary)] leading-tight">
                  {username}
                </p>
              </div>
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={username}
                  className="w-7 h-7 rounded-full border object-cover"
                  style={{ borderColor: 'var(--border-subtle)' }}
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[var(--text-primary)] flex items-center justify-center text-[10px] font-medium text-[var(--bg-canvas)]">
                  {displayInitial}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Outlet */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-[1200px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}
