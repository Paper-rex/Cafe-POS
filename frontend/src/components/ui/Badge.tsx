import React from 'react';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'neutral' | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success-pale text-brand-main',
  danger: 'bg-danger-pale text-danger',
  warning: 'bg-warning-pale text-amber-700',
  neutral: 'bg-gray-100 text-gray-600',
  info: 'bg-blue-50 text-blue-700',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-brand-main',
  danger: 'bg-danger',
  warning: 'bg-amber-500',
  neutral: 'bg-gray-400',
  info: 'bg-blue-500',
};

export function Badge({ variant = 'neutral', children, className = '', dot }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}
