import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import React from 'react';

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "className" | "children"> {
  variant?: 'primary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

const variantClasses = {
  primary: 'bg-brand-main hover:bg-brand-mid text-white shadow-card hover:shadow-card-hover',
  danger: 'bg-danger hover:bg-red-700 text-white shadow-card',
  ghost: 'bg-transparent hover:bg-surface-2 text-text-secondary',
  outline: 'bg-transparent border-2 border-brand-main text-brand-main hover:bg-brand-pale',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2.5',
};

export function Button({ variant = 'primary', size = 'md', loading, disabled, icon, children, className = '', ...props }: ButtonProps) {
  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 
        ${variantClasses[variant]} ${sizeClasses[size]}
        ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </motion.button>
  );
}
