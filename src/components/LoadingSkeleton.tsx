import React from 'react';

export const CardSkeleton: React.FC = () => (
  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm animate-pulse space-y-3">
    <div className="flex justify-between items-center">
      <div className="h-4 bg-slate-200 rounded w-1/3"></div>
      <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
    </div>
    <div className="h-8 bg-slate-200 rounded w-1/2"></div>
    <div className="h-3 bg-slate-200 rounded w-3/4"></div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="w-full bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
    <div className="h-12 bg-slate-100 border-b border-slate-200"></div>
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center justify-between gap-4">
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/6"></div>
          <div className="h-4 bg-slate-200 rounded w-1/6"></div>
          <div className="h-6 bg-slate-200 rounded-full w-24"></div>
        </div>
      ))}
    </div>
  </div>
);
