import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  AlertTriangle,
  Clock,
  FileBarChart,
  Settings,
  Shield,
  X,
  GraduationCap,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { role, user } = useAuthStore();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/students', label: 'Student Records', icon: Users },
    { to: '/review-queue', label: 'Review Queue', icon: CheckSquare },
    { to: '/validation', label: 'Validation Hub', icon: AlertTriangle },
    { to: '/delay-risk', label: 'Delay-Risk Analyzer', icon: Clock },
    { to: '/reports', label: 'Reports & Export', icon: FileBarChart },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:sticky top-0 h-screen w-64 bg-navy-900 text-white flex flex-col z-40 transition-transform duration-200 ease-in-out border-r border-navy-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo / Brand header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-navy-800/80 bg-navy-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-base tracking-wide text-white flex items-center gap-1.5">
                APAAR Verify
                <span className="text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded font-mono">
                  DEMO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">Verification & Risk Triage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-white" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User profile & Active Role card */}
        <div className="p-4 border-t border-navy-800/80 bg-navy-950/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {user?.name ? user.name.charAt(0) : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Authorized Staff'}</p>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                <Shield className="w-3 h-3 text-blue-400 shrink-0" />
                <span className="font-medium text-blue-300">{role}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-navy-800/60 text-[10px] text-slate-400 text-center font-mono">
            Demo Environment v1.0
          </div>
        </div>
      </aside>
    </>
  );
};
