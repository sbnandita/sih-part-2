import React from 'react';
import { ApplicationStatus, CaseStatus } from '../types';
import { CheckCircle2, Clock, AlertOctagon, HelpCircle, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: ApplicationStatus | CaseStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  switch (status) {
    case 'Verified in Demo':
    case 'Resolved':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 ${sizeClasses}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{status}</span>
        </span>
      );

    case 'Under Review':
    case 'Reviewed':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 ${sizeClasses}`}
        >
          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>{status}</span>
        </span>
      );

    case 'Needs Correction':
    case 'Follow-Up Required':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 ${sizeClasses}`}
        >
          <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>{status}</span>
        </span>
      );

    case 'Pending':
    case 'Open':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 ${sizeClasses}`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{status}</span>
        </span>
      );
  }
};
