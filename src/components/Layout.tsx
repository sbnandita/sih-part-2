import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { DemoBanner } from './DemoBanner';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ShieldAlert } from 'lucide-react';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      {/* 1. Non-negotiable Persistent Demo Banner */}
      <DemoBanner />

      <div className="flex-1 flex">
        {/* 2. Responsive Collapsible Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* 3. Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header onMenuToggle={() => setSidebarOpen((prev) => !prev)} />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>

          {/* Footer with Mandatory Disclaimers */}
          <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="flex items-center gap-1.5 text-slate-600">
                <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>APAAR Verify Prototype</strong> — Demonstration Environment Only.
                </span>
              </div>
              <div className="text-slate-400">
                Rule-Based Demo Estimates • No Official APAAR Integration • All Records Synthetic
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
