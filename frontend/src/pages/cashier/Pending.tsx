import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/Spinner';
import { useToastStore } from '../../store/useToastStore';
import { formatCurrency, formatDuration } from '../../lib/formatters';
import { CheckCircle, Banknote, CreditCard, Smartphone, Clock } from 'lucide-react';
import api from '../../lib/api';
import { useSSE } from '../../hooks/useSSE';
import type { Payment } from '../../types';
import BillModal from '../../components/shared/BillModal';

export default function CashierPending() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [amountTendered, setAmountTendered] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [activeBillOrder, setActiveBillOrder] = useState<any | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  const fetchPayments = async () => {
    try { const { data } = await api.get('/payments/pending'); setPayments(data); } catch {} finally { setLoading(false); }
  };

  useSSE({ onOrderStatusUpdated: fetchPayments, onPaymentConfirmed: fetchPayments });
  useEffect(() => { fetchPayments(); }, []);

  const handleConfirm = async () => {
    if (!selected) return; setConfirming(true);
    try {
      const body: any = {};
      if (selected.method === 'CASH') body.amountTendered = parseFloat(amountTendered);
      await api.patch(`/payments/${selected.id}/confirm`, body);
      addToast('success', `Payment confirmed — ${selected.order?.orderNumber}`);
      setSelected(null); setAmountTendered(''); fetchPayments();
    } catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); }
    finally { setConfirming(false); }
  };

  if (loading) return <PageLoader />;

  const methodIcon = (m: string) => {
    const map: Record<string, any> = { CASH: Banknote, CARD: CreditCard, UPI: Smartphone };
    const Icon = map[m] || CreditCard;
    return <Icon className="w-4 h-4" />;
  };

  const methodColor: Record<string, string> = { CASH: '#00FFB3', CARD: '#38BDF8', UPI: '#FF2D78' };

  return (
    <div className="flex gap-5">
      {/* Left: Pending List */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-neon-yellow" />
          <h1 className="text-2xl font-black tracking-[-0.02em] text-white uppercase">Pending Payments</h1>
          {payments.length > 0 && (
            <span className="ml-1 text-[10px] font-black uppercase tracking-[0.1em] px-2 py-1 bg-[rgba(255,230,0,0.1)] border border-[rgba(255,230,0,0.2)] rounded text-neon-yellow">
              {payments.length} pending
            </span>
          )}
        </div>

        {payments.length === 0 ? (
          <div className="p-14 text-center bg-surface-2 border border-edge rounded" style={{ boxShadow: '4px 4px 0px #00FFB3' }}>
            <CheckCircle className="w-10 h-10 text-neon-mint mx-auto mb-4" />
            <p className="text-xs text-ink-muted font-medium">All cleared! No pending payments.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => {
              const isSelected = selected?.id === payment.id;
              const isPaid = payment.status === 'PAID';
              const color = methodColor[payment.method] || '#A0A0A0';

              return (
                <motion.div key={payment.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div
                    className={`bg-surface-2 border rounded p-4 transition-all duration-100 ${
                      isPaid ? 'opacity-60' : 'cursor-pointer hover:translate-x-[-1px] hover:translate-y-[-1px]'
                    }`}
                    style={{
                      borderColor: isSelected ? color : '#2A2A2A',
                      boxShadow: isSelected ? `4px 4px 0px ${color}` : '4px 4px 0px #2A2A2A',
                      borderTop: `2px solid ${isSelected ? color : '#2A2A2A'}`,
                    }}
                    onClick={() => { if (!isPaid) { setSelected(payment); setAmountTendered(''); } }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span style={{ color }}>{methodIcon(payment.method)}</span>
                        <Badge variant={payment.method === 'CASH' ? 'success' : payment.method === 'CARD' ? 'info' : 'pink'}>
                          {payment.method}
                        </Badge>
                        <Badge variant={payment.status === 'PAID' ? 'success' : 'warning'} dot>
                          {payment.status}
                        </Badge>
                        {payment.method === 'UPI' && <Badge variant="info">Online</Badge>}
                      </div>
                      <p className="text-base font-black" style={{ color }}>
                        {formatCurrency(payment.amount)}
                      </p>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs font-bold font-mono text-ink-primary">#{payment.order?.orderNumber}</p>
                        <p className="text-[10px] text-ink-muted mt-0.5">
                          Table {(payment.order as any)?.table?.number} · Waiter: {payment.order?.waiter?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-ink-muted">{formatDuration(payment.createdAt)} ago</p>
                        {isPaid && payment.confirmedBy && (
                          <p className="text-[10px] font-bold text-neon-mint mt-0.5 flex items-center gap-0.5 justify-end">
                            <CheckCircle className="w-3 h-3" /> {payment.confirmedBy.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Confirm Panel */}
      {selected && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-80 shrink-0">
          <div className="bg-surface-2 border border-edge rounded p-6 sticky top-24"
               style={{ boxShadow: '4px 4px 0px #FFE600', borderTop: '2px solid #FFE600' }}>
            <h2 className="text-sm font-black tracking-[0.06em] uppercase text-white mb-5">Confirm Payment</h2>

            <div className="space-y-3 mb-5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">Order</span>
                <span className="text-xs font-mono font-bold text-ink-primary">{selected.order?.orderNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">Method</span>
                <Badge variant={selected.method === 'CASH' ? 'success' : 'info'}>{selected.method}</Badge>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-edge">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">Amount Due</span>
                <span className="text-lg font-black text-neon-yellow">{formatCurrency(selected.amount)}</span>
              </div>
            </div>

            {selected.method === 'CASH' && (
              <div className="space-y-3 mb-5 pt-4 border-t border-edge">
                <Input
                  label="Amount Tendered (₹)"
                  type="number"
                  placeholder="500"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                />
                {amountTendered && parseFloat(amountTendered) >= selected.amount && (
                  <div className="px-4 py-3 bg-[rgba(0,255,179,0.08)] border border-[rgba(0,255,179,0.2)] rounded">
                    <p className="text-xs font-bold text-neon-mint">
                      Change: {formatCurrency(parseFloat(amountTendered) - selected.amount)}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button className="flex-1" variant="outline" size="sm" onClick={() => setActiveBillOrder(selected.order)}>
                View Bill
              </Button>
              <Button
                className="flex-1"
                size="sm"
                loading={confirming}
                onClick={handleConfirm}
                disabled={selected.method === 'CASH' && (!amountTendered || parseFloat(amountTendered) < selected.amount)}
                icon={<CheckCircle className="w-3.5 h-3.5" />}
              >
                Confirm
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      <BillModal order={activeBillOrder} onClose={() => setActiveBillOrder(null)} />
    </div>
  );
}
