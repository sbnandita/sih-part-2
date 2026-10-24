import React from 'react';
import { Menu, ShieldCheck, Database, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { user, role, loginWithRole, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    loginWithRole(e.target.value as UserRole);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-9 z-30 shadow-xs">
      {/* Left side: Mobile menu toggle & title context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span>Local Demo Repository</span>
          <span className="text-slate-300">•</span>
          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
            Synchronized
          </span>
        </div>
      </div>

      {/* Right side: Role selector, profile, and logout */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Quick Role Switcher for Demo Mode */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-slate-500 font-medium hidden sm:inline">Role:</span>
          <select
            value={role}
            onChange={handleRoleChange}
            aria-label="Select Demo Role"
            className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
          >
            <option value="Admin">Admin (Full Access)</option>
            <option value="Reviewer">Reviewer (Verify/Edit)</option>
            <option value="Viewer">Viewer (Read Only)</option>
          </select>
        </div>

        {/* User display */}
        <div className="hidden md:flex flex-col text-right">
          <span className="text-xs font-semibold text-slate-800">{user?.name}</span>
          <span className="text-[11px] text-slate-500 truncate max-w-[180px]">
            {user?.institution}
          </span>
        </div>

        <button
          onClick={handleLogout}
          title="Sign out / Return to login"
          aria-label="Sign out"
          className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
