import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types';
import { DEMO_USERS } from '../lib/auth';
import { DemoBanner } from '../components/DemoBanner';
import { GraduationCap, ShieldCheck, ArrowRight, Lock, KeyRound, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithRole } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<UserRole>('Admin');
  const [supabaseEmail, setSupabaseEmail] = useState('');
  const [supabasePassword, setSupabasePassword] = useState('');
  const [activeTab, setActiveTab] = useState<'demo' | 'supabase'>('demo');

  const handleDemoLogin = (roleToLogin: UserRole) => {
    loginWithRole(roleToLogin);
    navigate('/dashboard');
  };

  const handleSupabaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In demo mode or if Supabase keys not set, explain or fallback
    alert('Supabase credentials mode: In this prototype, mock demo credentials are active by default. You will be signed in under the Reviewer role.');
    loginWithRole('Reviewer');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans">
      {/* Non-negotiable persistent banner on every page */}
      <DemoBanner />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
          {/* Header */}
          <div className="bg-navy-900 p-8 text-white text-center relative">
            <div className="w-14 h-14 mx-auto rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 mb-3 shadow-inner">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">APAAR Verify</h1>
            <p className="text-xs text-blue-200 mt-1">
              Smart Student Record Verification & Delay-Risk Platform
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              Prototype Demo v1.0
            </div>
          </div>

          {/* Tab selector */}
          <div className="flex border-b border-slate-200 text-sm font-semibold">
            <button
              onClick={() => setActiveTab('demo')}
              className={`flex-1 py-3 text-center transition-colors ${
                activeTab === 'demo'
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/40'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Demo Staff Access
            </button>
            <button
              onClick={() => setActiveTab('supabase')}
              className={`flex-1 py-3 text-center transition-colors ${
                activeTab === 'supabase'
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/40'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Supabase Auth (Cloud)
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'demo' ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Select an authorized demo role to explore the platform. Each role exhibits specific permissions and UI capabilities:
                </p>

                <div className="space-y-2.5">
                  {(['Admin', 'Reviewer', 'Viewer'] as UserRole[]).map((r) => {
                    const usr = DEMO_USERS[r];
                    const isSelected = selectedRole === r;
                    return (
                      <div
                        key={r}
                        onClick={() => setSelectedRole(r)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600'
                                : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800 text-sm">{r}</span>
                              <span className="text-[11px] text-slate-400">({usr.name})</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {r === 'Admin'
                                ? 'Full administrative control, settings, risk tuning'
                                : r === 'Reviewer'
                                ? 'Review queue, verification actions, audit logs'
                                : 'Read-only audit and analytics view'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => handleDemoLogin(selectedRole)}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-sm"
                >
                  <span>Launch Demo as {selectedRole}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleSupabaseSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Institutional Email
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={supabaseEmail}
                      onChange={(e) => setSupabaseEmail(e.target.value)}
                      placeholder="staff@institution.edu.in"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={supabasePassword}
                      onChange={(e) => setSupabasePassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  Supabase authentication will connect when <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> are configured in <code>.env</code>.
                </p>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm"
                >
                  Sign In via Supabase
                </button>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                Authorized Institution Staff Only • Synthetic Data
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
