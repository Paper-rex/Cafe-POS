import { formatCurrency, formatDate, formatTime } from '../../lib/formatters';
import type { Order } from '../../types';
import { X, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
interface BillModalProps {
  order: Order | null;
  onClose: () => void;
  onPrint?: () => void;
}

export default function BillModal({ order, onClose, onPrint }: BillModalProps) {
  
  if (!order) return null;

  const handlePrint = () => {
    window.print();
    if (onPrint) onPrint();
  };

  const subtotal = order.items.reduce((s, i) => s + i.subtotal, 0);
  const taxAmount = order.items.reduce((s, i) => s + (i.taxAmount || 0), 0);
  const total = subtotal + taxAmount;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-text/20 backdrop-blur-sm print:hidden"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-sm bg-white rounded-2xl shadow-soft-2xl overflow-hidden print:w-full print:max-w-none print:shadow-none print:bg-transparent"
        >
          {/* Header (Hidden in print) */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-border print:hidden bg-surface-1">
            <h3 className="font-bold text-text-primary">Order Bill</h3>
            <button onClick={onClose} className="p-1.5 hover:bg-surface-2 rounded-lg text-text-muted hover:text-text transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Bill Body (Printable Area) */}
          <div className="p-6 bg-white text-black print:p-0 print:m-0" id="print-bill-section">
            
            {/* Bill Header */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold uppercase tracking-widest mb-1">Café POS</h2>
              <p className="text-sm text-gray-500 mb-1">Receipt</p>
              <div className="text-xs text-gray-500">
                <p>Order #{order.orderNumber}</p>
                <p>{formatDate(order.createdAt)} {formatTime(order.createdAt)}</p>
                <p>Staff: {order.waiter?.name || 'Admin'} | Table: {order.table?.number || 'Takeaway'}</p>
              </div>
            </div>

            {/* Bill Items */}
            <div className="border-t border-b border-dashed border-gray-300 py-3 mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 font-medium">
                    <td className="w-8 pb-2">Qty</td>
                    <td className="pb-2">Item</td>
                    <td className="text-right pb-2">Total</td>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="py-1">{item.quantity}</td>
                      <td className="py-1 pr-2">
                        <div>{item.name}</div>
                        {Array.isArray(item.variants) && item.variants.map((v: any, i: number) => (
                          <div key={i} className="text-xs text-gray-500">+ {v.label}</div>
                        ))}
                        {Array.isArray(item.toppings) && item.toppings.map((t: any, i: number) => (
                          <div key={i} className="text-xs text-gray-500">+ {t.name}</div>
                        ))}
                      </td>
                      <td className="text-right py-1">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bill Totals */}
            <div className="space-y-1 mb-6 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Taxes</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t border-dashed border-gray-300">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-500 mt-6">
              <p>Thank you for visiting!</p>
              <p className="mt-1">Powered by Café POS</p>
            </div>
          </div>

          {/* Actions (Hidden in print) */}
          <div className="p-5 border-t border-border bg-surface-1 flex justify-end gap-3 print:hidden">
            <button
              onClick={onClose}
              className="px-4 py-2 font-medium text-text-secondary hover:bg-surface-2 rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 flex items-center gap-2 font-semibold text-white bg-brand hover:bg-brand-dark rounded-xl transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill</span>
            </button>
          </div>
        </motion.div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-bill-section, #print-bill-section * {
            visibility: visible;
          }
          #print-bill-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
          }
          @page {
            margin: 0;
          }
        }
      `}</style>
    </AnimatePresence>
  );
}
