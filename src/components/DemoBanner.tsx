import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  return (
    <div
      role="banner"
      aria-label="Demo environment notification"
      className="bg-amber-500 text-slate-950 px-4 py-2 font-medium text-xs sm:text-sm flex flex-wrap items-center justify-between gap-2 shadow-sm border-b border-amber-600/20 select-none z-50 sticky top-0"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0 animate-pulse" />
        <span className="font-bold tracking-tight">
          Demo Mode — Official APAAR API Not Connected
        </span>
        <span className="hidden md:inline text-slate-900/90 text-xs">
          | Synthetic demo data only. No real citizen or student identifiers are processed.
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 bg-amber-600/30 text-slate-950 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" /> Synthetic Demo Data
        </span>
      </div>
    </div>
  );
};
