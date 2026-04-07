import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  accent?: 'pink' | 'mint' | 'yellow' | 'none';
}

const accentShadow = {
  pink: 'shadow-brutal',
  mint: 'shadow-brutal-mint',
  yellow: 'shadow-brutal-yellow',
  none: '',
};

const accentHover = {
  pink: 'hover:shadow-[6px_6px_0px_#FF2D78] hover:translate-x-[-1px] hover:translate-y-[-1px]',
  mint: 'hover:shadow-[6px_6px_0px_#00FFB3] hover:translate-x-[-1px] hover:translate-y-[-1px]',
  yellow: 'hover:shadow-[6px_6px_0px_#FFE600] hover:translate-x-[-1px] hover:translate-y-[-1px]',
  none: 'hover:border-surface-4',
};

export function Card({ children, className = '', hover = false, onClick, accent = 'pink' }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface-2 border border-edge rounded
        ${accentShadow[accent]}
        ${hover ? `transition-all duration-100 cursor-pointer ${accentHover[accent]}` : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}`}
    >
      {children}
    </div>
  );
}
