import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';

const config = {
  success: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    emoji: '✅',
    accentColor: '#00FFB3',
    label: 'SUCCESS',
    textColor: 'text-neon-mint',
    borderColor: 'border-l-neon-mint',
  },
  error: {
    icon: <AlertCircle className="w-4 h-4" />,
    emoji: '❌',
    accentColor: '#FF3B5C',
    label: 'ERROR',
    textColor: 'text-danger',
    borderColor: 'border-l-danger',
  },
  info: {
    icon: <Info className="w-4 h-4" />,
    emoji: '📡',
    accentColor: '#38BDF8',
    label: 'INFO',
    textColor: 'text-info',
    borderColor: 'border-l-info',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    emoji: '⚡',
    accentColor: '#FFE600',
    label: 'ALERT',
    textColor: 'text-warning',
    borderColor: 'border-l-warning',
  },
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
      <AnimatePresence>
        {toasts.map((toast) => {
          const c = config[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, y: -8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`
                flex items-start gap-3 px-4 py-3
                bg-surface-2 border border-edge border-l-4 ${c.borderColor}
                rounded shadow-brutal-sm
              `}
              style={{ borderLeftColor: c.accentColor }}
            >
              <span className={`mt-0.5 ${c.textColor} shrink-0`}>{c.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-[9px] font-black tracking-[0.15em] uppercase ${c.textColor} mb-0.5`}>
                  {c.label}
                </p>
                <p className="text-xs text-ink-primary leading-relaxed">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-ink-muted hover:text-ink-primary transition-colors shrink-0 mt-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
