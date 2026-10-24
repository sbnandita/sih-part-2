import React from 'react';
import { RiskLabel } from '../types';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

interface RiskBadgeProps {
  label: RiskLabel;
  score?: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  label,
  score,
  showScore = false,
  size = 'md',
}) => {
  let colorStyles = '';
  let Icon = ShieldCheck;
  let text = `${label} Risk`;

  if (label === 'High') {
    colorStyles = 'bg-rose-50 text-rose-700 border-rose-300 ring-rose-200';
    Icon = AlertOctagon;
  } else if (label === 'Medium') {
    colorStyles = 'bg-amber-50 text-amber-800 border-amber-300 ring-amber-200';
    Icon = AlertTriangle;
  } else {
    colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-200';
    Icon = ShieldCheck;
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs'
      : size === 'lg'
      ? 'px-3.5 py-1.5 text-sm font-semibold'
      : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium tracking-wide ${colorStyles} ${sizeClasses}`}
      title={`Delay Risk: ${label}${score !== undefined ? ` (Score: ${score} pts)` : ''} - Rule-Based Demo Estimate`}
    >
      <Icon className={size === 'lg' ? 'w-4 h-4 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />
      <span>{text}</span>
      {showScore && score !== undefined && (
        <span className="ml-1 opacity-75 font-mono text-[11px]">({score} pts)</span>
      )}
    </span>
  );
};
