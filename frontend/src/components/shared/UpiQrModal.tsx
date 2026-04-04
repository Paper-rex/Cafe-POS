import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

interface UpiQrModalProps {
  upiData: string | null;
  amount: number;
  onClose: () => void;
}

export default function UpiQrModal({ upiData, amount, onClose }: UpiQrModalProps) {
  if (!upiData) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-text/20 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-sm bg-white rounded-3xl shadow-soft-2xl overflow-hidden text-center"
        >
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-border bg-surface-1">
            <h3 className="font-bold text-text-primary">Scan to Pay UPI</h3>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-surface-2 rounded-lg text-text-muted hover:text-text transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-8 pb-10 flex flex-col items-center bg-white">
            <h4 className="text-sm font-medium text-text-secondary uppercase tracking-widest mb-1">
              Amount to Pay
            </h4>
            <div className="text-3xl font-display font-bold text-text-primary mb-6">
              ₹{amount.toFixed(2)}
            </div>

            <div className="p-4 bg-white border-2 border-border rounded-2xl shadow-sm inline-block">
              <QRCodeSVG
                value={upiData}
                size={200}
                bgColor={"#FFFFFF"}
                fgColor={"#000000"}
                level={"H"}
                includeMargin={false}
              />
            </div>
            
            <p className="mt-6 text-sm text-text-muted max-w-xs mx-auto leading-relaxed">
              Scan this QR code with PhonePe, GPay, Paytm, or any UPI app to complete your payment.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
