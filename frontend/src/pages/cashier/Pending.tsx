import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/Spinner';
import { useToastStore } from '../../store/useToastStore';
import { formatCurrency, formatDuration } from '../../lib/formatters';
import { CheckCircle, Banknote, CreditCard, Smartphone } from 'lucide-react';
import api from '../../lib/api';
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
  useEffect(() => { fetchPayments(); const i = setInterval(fetchPayments, 5000); return () => clearInterval(i); }, []);

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

  const methodIcon = (m: string) => m === 'CASH' ? <Banknote className="w-4 h-4" /> : m === 'CARD' ? <CreditCard className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />;

  return (
    <div className="flex gap-6">
      {/* Left: Pending List */}
      <div className="flex-1">
        <h1 className="font-display text-2xl font-bold text-text-primary mb-6">Pending Payments</h1>
        {payments.length === 0 ? (
          <Card className="p-12 text-center"><CheckCircle className="w-12 h-12 text-brand-main mx-auto mb-3" /><p className="text-text-secondary">No pending payments</p></Card>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <motion.div key={payment.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className={`p-4 transition-all ${payment.status === 'PAID' ? 'opacity-70 bg-surface-1/50' : 'cursor-pointer'} ${selected?.id === payment.id ? 'ring-2 ring-brand-main' : ''}`}
                  hover={payment.status !== 'PAID'} onClick={() => { if(payment.status !== 'PAID') { setSelected(payment); setAmountTendered(''); } }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {methodIcon(payment.method)}
                        <Badge variant={payment.method === 'CASH' ? 'success' : payment.method === 'CARD' ? 'info' : 'warning'}>{payment.method}</Badge>
                        {payment.status === 'PAID' && <Badge variant="success">PAID</Badge>}
                      </div>
                    </div>
                    <div className="text-right"><p className="font-display font-bold text-text-primary">{formatCurrency(payment.amount)}</p></div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="font-mono text-sm font-bold">Ord {payment.order?.orderNumber}</p>
                      <p className="text-xs text-text-muted">Table {(payment.order as any)?.table?.number} • Waiter: {payment.order?.waiter?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-muted">{formatDuration(payment.createdAt)} ago</p>
                      {payment.status === 'PAID' && payment.confirmedBy && (
                        <p className="text-xs font-medium text-brand-dark mt-1 flex items-center gap-1 justify-end">
                          <CheckCircle className="w-3 h-3" /> Confirmed: {payment.confirmedBy.name}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Confirmation Panel */}
      {selected && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-96 shrink-0">
          <Card className="p-6 sticky top-24">
            <h2 className="font-display text-lg font-semibold mb-4">Confirm Payment</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm"><span className="text-text-secondary">Order</span><span className="font-mono font-medium">{selected.order?.orderNumber}</span></div>
              <div className="flex justify-between text-sm"><span className="text-text-secondary">Method</span><Badge variant={selected.method === 'CASH' ? 'success' : 'info'}>{selected.method}</Badge></div>
              <div className="flex justify-between text-sm"><span className="text-text-secondary">Amount</span><span className="font-display font-bold text-lg">{formatCurrency(selected.amount)}</span></div>
            </div>

            {selected.method === 'CASH' && (
              <div className="space-y-3 mb-4 pt-4 border-t border-border">
                <Input label="Amount Tendered (₹)" type="number" placeholder="500" value={amountTendered} onChange={(e) => setAmountTendered(e.target.value)} />
                {amountTendered && parseFloat(amountTendered) >= selected.amount && (
                  <div className="px-4 py-3 bg-success-pale rounded-xl"><p className="text-sm font-medium text-brand-dark">Change: {formatCurrency(parseFloat(amountTendered) - selected.amount)}</p></div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button className="flex-1" variant="outline" size="lg" onClick={() => setActiveBillOrder(selected.order)}>
                View Bill
              </Button>
              <Button className="flex-1" size="lg" loading={confirming} onClick={handleConfirm}
                disabled={selected.method === 'CASH' && (!amountTendered || parseFloat(amountTendered) < selected.amount)}
                icon={<CheckCircle className="w-4 h-4" />}>
                Confirm
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      <BillModal 
        order={activeBillOrder} 
        onClose={() => setActiveBillOrder(null)} 
      />
    </div>
  );
}
