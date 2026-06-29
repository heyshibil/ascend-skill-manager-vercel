import React, { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  Search,
  RotateCw,
  Bell,
  LayoutDashboard,
  Sliders,
  TrendingUp,
  Settings,
  LogOut,
  Swords,
  Trophy
} from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";
import LogoutModal from "../components/LogoutModal";
import useAuthStore from "../store/useAuthStore";
import { useMarketStore } from "../store/useMarketStore";

export default function DashboardLayout() {
  const initializeMarketStream = useMarketStore(
    (state) => state.initializeMarketStream,
  );

  const closeMarketStream = useMarketStore((state) => state.closeMarketStream);

  // Kickstart the SSE stream
  useEffect(() => {
    initializeMarketStream();

    return () => {
      closeMarketStream();
    };
  }, [initializeMarketStream, closeMarketStream]);

  const { data } = useDashboard();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const username = user?.username || "Guest";
  const displayInitial = user?.username.charAt(0).toUpperCase() || "G";

  // Logout handler
  const handleLogout = async () => {
    setIsLogoutModalOpen(false);
    await logout();
    navigate("/login");
  };

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-2 px-2 h-8 rounded-[var(--radius-md)] transition-colors text-[14px] ${
      isActive
        ? "bg-[var(--bg-raised)] text-[var(--text-primary)] font-medium"
        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)]"
    }`;

  return (
    <div className="theme-dark flex h-screen font-[var(--font-sans)] overflow-hidden" style={{ background: 'var(--bg-canvas)', color: 'var(--text-secondary)' }}>
      {/* --- Left Sidebar --- */}
      <aside className="w-[220px] flex flex-col" style={{ background: 'var(--bg-canvas)' }}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[#2563EB] flex items-center justify-center mr-2">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span className="font-medium text-[var(--text-primary)] text-[15px] tracking-[-0.01em]">
            Ascend
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          <p className="px-2 text-[11px] font-medium tracking-wide text-[var(--text-tertiary)] mb-2 mt-1">
            Navigation
          </p>

          <NavLink to="/dashboard" end className={navItemClass}>
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </NavLink>

          <NavLink to="/dashboard/skill-control" className={navItemClass}>
            <Sliders className="w-4 h-4" />
            Skills
          </NavLink>

          <NavLink to="/dashboard/market-intel" className={navItemClass}>
            <TrendingUp className="w-4 h-4" />
            Market
          </NavLink>

          <NavLink to="/dashboard/problems" className={navItemClass}>
            <Swords className="w-4 h-4" />
            Problems
          </NavLink>

          <NavLink to="/dashboard/leaderboard" className={navItemClass}>
            <Trophy className="w-4 h-4" />
            Leaderboard
          </NavLink>

          <NavLink to="/dashboard/settings" className={navItemClass}>
            <Settings className="w-4 h-4" />
            Settings
          </NavLink>
        </nav>

        {/* Quick Stats */}
        <div className="p-3 mb-3 mx-3 rounded-[var(--radius-lg)] border flex flex-col gap-2" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <p className="text-[11px] font-medium tracking-wide text-[var(--text-tertiary)]">
            Quick stats
          </p>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[var(--text-secondary)]">Skill debts</span>
            <span className="text-[var(--danger)] font-medium font-[var(--font-mono)]">
            {data?.skillDebts?.critical ?? 0}
            </span>
          </div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[var(--text-secondary)]">Draining</span>
            <span className="text-[var(--warning)] font-medium font-[var(--font-mono)]">
            {data?.skillDebts?.drainingSkills ?? 0}
            </span>
          </div>
        </div>

        {/* Logout */}
        <div className="px-3 mt-auto mb-4 w-full">
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full flex items-center gap-2 px-3 h-9 rounded-[var(--radius-md)] border text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors text-[13px] font-medium"
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
          <div className="flex items-center gap-4">
            {/* Placeholder for breadcrumb/title */}
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative group hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] group-focus-within:text-[var(--accent)] transition-colors" />
              <input
                type="text"
                placeholder="Search skills..."
                className="border rounded-[var(--radius-md)] pl-9 pr-12 h-9 text-[13px] w-64 outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(37,99,235,0.15)]"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-base)', color: 'var(--text-primary)' }}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 border rounded px-1.5 py-0.5" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-raised)' }}>
                <span className="text-[10px] text-[var(--text-tertiary)] font-[var(--font-mono)]">⌘K</span>
              </div>
            </div>

            {/* Sync */}
            <button className="flex items-center gap-2 px-3 h-9 rounded-[var(--radius-md)] border text-[var(--text-secondary)] text-[13px] font-medium hover:bg-[var(--bg-raised)] transition-colors" style={{ borderColor: 'var(--border-base)' }}>
              <RotateCw className="w-3.5 h-3.5" />
              Sync
            </button>

            {/* Bell */}
            <button className="relative w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[var(--danger)] rounded-full"></span>
            </button>

            {/* User */}
            <div className="flex items-center gap-2 pl-3 border-l ml-1" style={{ borderColor: 'var(--border-subtle)' }}>
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={username}
                  className="w-7 h-7 rounded-full border object-cover"
                  style={{ borderColor: 'var(--border-subtle)' }}
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center text-[10px] font-medium text-white">
                  {displayInitial}
                </div>
              )}
              <span className="text-[13px] font-medium text-[var(--text-primary)] hidden xl:block">
                {username}
              </span>
            </div>
          </div>
        </header>

        {/* Dynamic Route Outlet */}
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
