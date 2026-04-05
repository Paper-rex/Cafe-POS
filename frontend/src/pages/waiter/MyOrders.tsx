import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import { useToastStore } from '../../store/useToastStore';
import { formatCurrency, formatTime, getStatusColor } from '../../lib/formatters';
import { CheckCircle, CreditCard, Banknote, QrCode, CheckSquare } from 'lucide-react';
import api from '../../lib/api';
import { useSSE } from '../../hooks/useSSE';
import type { Order, OrderItem, Payment } from '../../types';
import BillModal from '../../components/shared/BillModal';
import UpiQrModal from '../../components/shared/UpiQrModal';

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [activeBillOrder, setActiveBillOrder] = useState<Order | null>(null);
  const [activeUpiPayment, setActiveUpiPayment] = useState<Payment | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  const fetchOrders = async () => {
    try { 
      const { data } = await api.get('/orders'); 
      setOrders(data.filter((o: Order | any) => {
        if (o.status === 'CANCELLED' || o.status === 'PAID') return false;
        if (o.status === 'PAYMENT_PENDING' && o.payment?.method === 'CASH') return false;
        return true;
      })); 
    } catch {} finally { setLoading(false); }
  };
  useSSE({
    onOrderStatusUpdated: fetchOrders,
    onOrderReadyToServe: fetchOrders,
    onPaymentConfirmed: fetchOrders,
    onOrderItemUpdated: fetchOrders,
  });

  useEffect(() => { fetchOrders(); }, []);

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleMarkServed = async (orderId: string, availableReadyItems: OrderItem[]) => {
    const itemsToMove = availableReadyItems.filter(i => selectedItems.has(i.id));
    const finalItems = itemsToMove.length > 0 ? itemsToMove : availableReadyItems;
    const itemIds = finalItems.map(i => i.id);

    try {
      await api.patch(`/orders/${orderId}/items/status`, { itemIds, status: 'SERVED' });
      addToast('success', `Marked ${itemIds.length} item(s) as served`);
      setSelectedItems(new Set());
      fetchOrders();
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed');
    }
  };

  const handleInitiatePayment = async (orderId: string, method: string) => {
    try {
      const { data } = await api.post('/payments', { orderId, method });
      
      if (method === 'UPI' && data.upiQrData) {
        setActiveUpiPayment(data);
      } else if (method === 'CASH') {
        addToast('success', 'Cash payment pending. Please collect and hand to Cashier.');
      } else {
        addToast('success', `${method} payment initiated`);
      }
      fetchOrders();
    } catch (err: any) { 
      addToast('error', err.response?.data?.error || 'Failed to process payment'); 
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-text-primary mb-6">My Orders</h1>
      {orders.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-text-muted">No active orders</p></Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {orders.map(order => {
            const allItemsServed = order.items.length > 0 && order.items.every(i => i.itemStatus === 'SERVED');
            const readyItems = order.items.filter(i => i.itemStatus === 'READY');
            const selectedReadyCount = readyItems.filter(i => selectedItems.has(i.id)).length;
            const paymentStatus = order.payment?.status || 'UNPAID';
            const paymentMethod = order.payment?.method || null;
            const isPaid = paymentStatus === 'PAID';

            return (
              <Card key={order.id} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-mono font-bold text-text-primary">{order.orderNumber}</h3>
                    <p className="text-xs text-text-muted">Table {order.table?.number} • {formatTime(order.createdAt)}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <Badge variant={isPaid ? 'success' : paymentStatus === 'PENDING' ? 'warning' : 'neutral'}>
                    {isPaid ? `${paymentMethod || 'ONLINE'} PAID` : paymentStatus}
                  </Badge>
                  {isPaid && paymentMethod === 'UPI' && <Badge variant="info">ONLINE PAYMENT</Badge>}
                </div>

                {/* Items List */}
                <div className="space-y-2 mb-4 bg-surface-1 p-3 rounded-xl border border-surface-2">
                  <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Order Items</h4>
                  {order.items.map(item => {
                    const isReady = item.itemStatus === 'READY';
                    const isSelected = selectedItems.has(item.id);
                    return (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {isReady ? (
                            <input 
                              type="checkbox" 
                              checked={isSelected} 
                              onChange={() => toggleItemSelection(item.id)}
                              className="w-4 h-4 rounded border-border text-brand-main focus:ring-brand-pale cursor-pointer" 
                            />
                          ) : (
                            <div className="w-4 h-4" /> // spacing
                          )}
                          <span className={`${item.itemStatus === 'SERVED' ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                            {item.quantity}x {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getStatusColor(item.itemStatus || 'PENDING')}`}>
                            {item.itemStatus || 'PENDING'}
                          </span>
                          <span className="text-text-primary font-medium w-16 text-right">{formatCurrency(item.subtotal)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-surface-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-text-muted">Subtotal: {formatCurrency(order.items.reduce((s, i) => s + i.subtotal, 0))}</span>
                    <span className="text-xs text-text-muted">Taxes: {formatCurrency(order.items.reduce((s, i) => s + (i.taxAmount || 0), 0))}</span>
                    <span className="font-display text-lg font-bold text-text-primary mt-1">
                      Total: {formatCurrency(order.items.reduce((s, i) => s + i.subtotal + (i.taxAmount || 0), 0))}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    {readyItems.length > 0 && (
                      <Button 
                        size="sm" 
                        icon={selectedReadyCount > 0 ? <CheckSquare className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />} 
                        onClick={() => handleMarkServed(order.id, readyItems)}
                      >
                        {selectedReadyCount > 0 ? `Serve ${selectedReadyCount}` : 'Serve All Ready'}
                      </Button>
                    )}
                    
                    {allItemsServed && !isPaid && order.status !== 'PAYMENT_PENDING' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setActiveBillOrder(order)}>View Bill</Button>
                        <Button size="sm" variant="outline" icon={<Banknote className="w-4 h-4" />} onClick={() => handleInitiatePayment(order.id, 'CASH')}>Cash</Button>
                        <Button size="sm" variant="outline" icon={<CreditCard className="w-4 h-4" />} onClick={() => handleInitiatePayment(order.id, 'CARD')}>Card</Button>
                        <Button size="sm" variant="outline" icon={<QrCode className="w-4 h-4" />} onClick={() => handleInitiatePayment(order.id, 'UPI')}>UPI</Button>
                      </div>
                    )}

                    {!isPaid && order.status === 'PAYMENT_PENDING' && (
                       <Badge variant="warning">Waiting for Payment</Badge>
                    )}

                    {isPaid && (
                      <Badge variant="success">Payment Received</Badge>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      
      
      <BillModal 
        order={activeBillOrder} 
        onClose={() => setActiveBillOrder(null)} 
      />

      {activeUpiPayment && (
        <UpiQrModal
          upiData={activeUpiPayment.upiQrData}
          amount={activeUpiPayment.amount}
          onClose={() => setActiveUpiPayment(null)}
        />
      )}
    </div>
  );
}
