import { Loader2 } from 'lucide-react';

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return <Loader2 className={`${sizeClasses[size]} animate-spin text-neon-pink`} />;
}

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="relative">
        <div className="w-10 h-10 border-2 border-surface-4 rounded-full" />
        <div className="absolute inset-0 w-10 h-10 border-2 border-neon-pink border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-[10px] font-black tracking-[0.2em] uppercase text-ink-muted animate-pulse-soft">
        Loading...
      </p>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface-3 rounded animate-pulse-soft ${className}`} />
  );
}
