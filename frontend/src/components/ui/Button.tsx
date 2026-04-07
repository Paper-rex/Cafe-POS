import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import React from 'react';

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "className" | "children"> {
  variant?: 'primary' | 'danger' | 'ghost' | 'outline' | 'mint' | 'yellow';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

const variantClasses = {
  primary: 'bg-neon-pink text-white border border-neon-pink shadow-brutal-sm hover:shadow-brutal active:shadow-brutal-pressed hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px]',
  danger: 'bg-danger text-white border border-danger shadow-[2px_2px_0px_#FF3B5C] hover:shadow-[4px_4px_0px_#FF3B5C] hover:translate-x-[-1px] hover:translate-y-[-1px]',
  ghost: 'bg-transparent text-ink-secondary hover:bg-surface-3 hover:text-ink-primary border border-transparent',
  outline: 'bg-transparent border border-neon-pink text-neon-pink hover:bg-[rgba(255,45,120,0.08)] shadow-brutal-sm hover:shadow-brutal',
  mint: 'bg-neon-mint text-surface-0 border border-neon-mint shadow-brutal-mint hover:translate-x-[-1px] hover:translate-y-[-1px]',
  yellow: 'bg-neon-yellow text-surface-0 border border-neon-yellow shadow-brutal-yellow hover:translate-x-[-1px] hover:translate-y-[-1px]',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs rounded gap-1.5',
  md: 'px-5 py-2.5 text-xs rounded gap-2',
  lg: 'px-6 py-3 text-sm rounded gap-2.5',
};

export function Button({ variant = 'primary', size = 'md', loading, disabled, icon, children, className = '', ...props }: ButtonProps) {
  return (
    <motion.button
      whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
      className={`inline-flex items-center justify-center font-bold uppercase tracking-wide transition-all duration-100
        ${variantClasses[variant]} ${sizeClasses[size]}
        ${(disabled || loading) ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}
        ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </motion.button>
  );
}
