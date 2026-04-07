import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Zap } from 'lucide-react';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  danger?: boolean;
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', loading, danger = true }: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70" onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="relative bg-surface-1 border border-edge rounded w-full max-w-md p-6"
            style={{
              boxShadow: danger ? '6px 6px 0px #FF3B5C' : '6px 6px 0px #FFE600',
              borderTop: danger ? '2px solid #FF3B5C' : '2px solid #FFE600',
            }}
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded border flex items-center justify-center shrink-0 ${
                danger ? 'bg-[rgba(255,59,92,0.12)] border-[rgba(255,59,92,0.25)]' : 'bg-[rgba(255,230,0,0.12)] border-[rgba(255,230,0,0.25)]'
              }`}>
                {danger
                  ? <AlertTriangle className="w-5 h-5 text-danger" />
                  : <Zap className="w-5 h-5 text-neon-yellow" />
                }
              </div>
              <div>
                <h3 className="text-sm font-black tracking-[0.06em] uppercase text-ink-primary mb-1.5">
                  {title}
                </h3>
                <p className="text-xs text-ink-secondary leading-relaxed">{message}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="ghost" onClick={onClose} className="flex-1 border border-edge">
                Cancel
              </Button>
              <Button
                variant={danger ? 'danger' : 'yellow'}
                onClick={onConfirm}
                loading={loading}
                className="flex-1"
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
