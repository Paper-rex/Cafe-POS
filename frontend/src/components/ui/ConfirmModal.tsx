import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="relative bg-white rounded-2xl shadow-modal w-full max-w-md p-6">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${danger ? 'bg-danger-pale' : 'bg-warning-pale'}`}>
                <AlertTriangle className={`w-6 h-6 ${danger ? 'text-danger' : 'text-amber-600'}`} />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-text-primary mb-1">{title}</h3>
                <p className="text-sm text-text-secondary">{message}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
              <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} className="flex-1">{confirmLabel}</Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
