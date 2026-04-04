import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';

const icons = {
  success: <CheckCircle2 className="w-5 h-5 text-brand-main" />,
  error: <AlertCircle className="w-5 h-5 text-danger" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
};

const bgColors = {
  success: 'bg-success-pale border-brand-light',
  error: 'bg-danger-pale border-red-200',
  info: 'bg-blue-50 border-blue-200',
  warning: 'bg-warning-pale border-amber-200',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-card ${bgColors[toast.type]}`}
          >
            {icons[toast.type]}
            <p className="text-sm text-text-primary flex-1">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="text-text-muted hover:text-text-primary">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
