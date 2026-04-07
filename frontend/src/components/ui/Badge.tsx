import React from 'react';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'neutral' | 'info' | 'pink';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-[rgba(0,255,179,0.12)] text-neon-mint border border-[rgba(0,255,179,0.25)]',
  danger: 'bg-[rgba(255,59,92,0.12)] text-danger border border-[rgba(255,59,92,0.25)]',
  warning: 'bg-[rgba(255,230,0,0.12)] text-neon-yellow border border-[rgba(255,230,0,0.25)]',
  neutral: 'bg-surface-3 text-ink-secondary border border-edge',
  info: 'bg-[rgba(56,189,248,0.12)] text-info border border-[rgba(56,189,248,0.25)]',
  pink: 'bg-[rgba(255,45,120,0.12)] text-neon-pink border border-[rgba(255,45,120,0.25)]',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-neon-mint',
  danger: 'bg-danger',
  warning: 'bg-neon-yellow',
  neutral: 'bg-ink-muted',
  info: 'bg-info',
  pink: 'bg-neon-pink',
};

export function Badge({ variant = 'neutral', children, className = '', dot }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-[0.08em] uppercase ${variantClasses[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}
