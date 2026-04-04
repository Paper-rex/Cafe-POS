import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import { useToastStore } from '../../store/useToastStore';
import { formatCurrency, formatTime, getStatusColor } from '../../lib/formatters';
import { CheckCircle, CreditCard } from 'lucide-react';
import api from '../../lib/api';
import type { Order } from '../../types';

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore((s) => s.addToast);

  const fetchOrders = async () => {
    try { const { data } = await api.get('/orders'); setOrders(data.filter((o: Order) => o.status !== 'CANCELLED')); }
    catch {} finally { setLoading(false); }
  };
  useEffect(() => { fetchOrders(); const i = setInterval(fetchOrders, 5000); return () => clearInterval(i); }, []);

  const handleMarkServed = async (orderId: string) => {
    try { await api.patch(`/orders/${orderId}/status`, { status: 'SERVED' }); addToast('success', 'Marked as served'); fetchOrders(); }
    catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); }
  };

  const handleInitiatePayment = async (orderId: string, method: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: 'PAYMENT_PENDING' });
      await api.post('/payments', { orderId, method });
      addToast('success', `${method} payment initiated`); fetchOrders();
    } catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <PageLoader />;

  const statusSteps = ['CREATED', 'SENT', 'PENDING', 'COOKING', 'READY', 'SERVED', 'PAYMENT_PENDING', 'PAID'];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-text-primary mb-6">My Orders</h1>
      {orders.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-text-muted">No orders yet this session</p></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map(order => {
            const stepIdx = statusSteps.indexOf(order.status);
            return (
              <Card key={order.id} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div><h3 className="font-mono font-bold text-text-primary">{order.orderNumber}</h3><p className="text-xs text-text-muted">Table {order.table?.number} • {formatTime(order.createdAt)}</p></div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>{order.status}</span>
                </div>
                {/* Status Timeline */}
                <div className="flex items-center gap-1 mb-4">
                  {statusSteps.map((s, i) => (
                    <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= stepIdx ? 'bg-brand-main' : 'bg-surface-2'}`} />
                  ))}
                </div>
                <div className="space-y-1 mb-3">
                  {order.items.slice(0, 3).map(item => (
                    <div key={item.id} className="flex justify-between text-sm"><span className="text-text-secondary">{item.quantity}x {item.name}</span><span className="text-text-primary">{formatCurrency(item.subtotal)}</span></div>
                  ))}
                  {order.items.length > 3 && <p className="text-xs text-text-muted">+{order.items.length - 3} more items</p>}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-surface-2">
                  <span className="font-display font-bold text-text-primary">{formatCurrency(order.items.reduce((s, i) => s + i.subtotal, 0))}</span>
                  <div className="flex gap-2">
                    {order.status === 'READY' && <Button size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />} onClick={() => handleMarkServed(order.id)}>Served</Button>}
                    {order.status === 'SERVED' && <Button size="sm" icon={<CreditCard className="w-3.5 h-3.5" />} onClick={() => handleInitiatePayment(order.id, 'CASH')}>Pay</Button>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
