import React from 'react';
import { Snowflake, AlertCircle } from 'lucide-react';

interface ColdChainBadgeProps {
  requiereFrio: boolean;
  mostrarAdvertencia?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function ColdChainBadge({
  requiereFrio,
  mostrarAdvertencia = false,
  className = '',
  size = 'md',
}: ColdChainBadgeProps) {
  if (!requiereFrio) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <span
        role="status"
        aria-label="Alimento perecedero: Requiere Refrigeración"
        className={`inline-flex items-center font-semibold rounded-md border shadow-sm
          bg-sky-900 text-sky-50 border-sky-300
          ${sizeClasses[size]}`}
      >
        <Snowflake
          className={`${iconSizes[size]} text-sky-200 animate-pulse shrink-0`}
          aria-hidden="true"
        />
        <span className="tracking-wide uppercase font-mono">
          Requiere Refrigeración
        </span>
      </span>

      {mostrarAdvertencia && (
        <p
          role="note"
          className="flex items-start gap-1 text-[11px] font-medium text-sky-100 bg-sky-950/90 border border-sky-500/50 rounded p-1.5 leading-snug"
        >
          <AlertCircle className="w-3.5 h-3.5 text-sky-300 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Apto únicamente para comedores comunitarios con equipamiento de refrigeración operativo.
          </span>
        </p>
      )}
    </div>
  );
}
