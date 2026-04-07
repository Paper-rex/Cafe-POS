import { useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import { useToastStore } from '../../store/useToastStore';
import { formatCurrency, formatTime } from '../../lib/formatters';
import { CheckCircle, CreditCard, Banknote, QrCode, CheckSquare, ClipboardList } from 'lucide-react';
import api from '../../lib/api';
import { useSSE } from '../../hooks/useSSE';
import type { Order, OrderItem, Payment } from '../../types';
import BillModal from '../../components/shared/BillModal';
import UpiQrModal from '../../components/shared/UpiQrModal';
import TransferOrderModal from '../../components/shared/TransferOrderModal';
import { MoveRight } from 'lucide-react';

const itemStatusColor: Record<string, string> = {
  PENDING: '#505050',
  COOKING: '#FF6B2B',
  READY: '#00FFB3',
  SERVED: '#2A2A2A',
};

const orderStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'pink' => {
  const m: Record<string, any> = {
    SERVED: 'success', PAID: 'success',
    COOKING: 'warning', PENDING: 'warning', PAYMENT_PENDING: 'pink',
    CANCELLED: 'danger', SENT: 'info',
  };
  return m[status] || 'neutral';
};

import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function MyOrders() {
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [activeBillOrder, setActiveBillOrder] = useState<Order | null>(null);
  const [activeUpiPayment, setActiveUpiPayment] = useState<Payment | null>(null);
  const [transferOrder, setTransferOrder] = useState<Order | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  const { data: orders = [], isLoading: loading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data } = await api.get<Order[]>('/orders');
      return data.filter((o) => {
        if (o.status === 'CANCELLED' || o.status === 'PAID') return false;
        if (o.status === 'PAYMENT_PENDING' && o.payment?.method === 'CASH') return false;
        return true;
      });
    },
  });

  useSSE({
    onOrderStatusUpdated: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
    onOrderReadyToServe: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
    onPaymentConfirmed: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
    onOrderItemUpdated: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
    onOrderCreated: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => { const next = new Set(prev); if (next.has(itemId)) next.delete(itemId); else next.add(itemId); return next; });
  };

  const handleMarkServed = async (orderId: string, availableReadyItems: OrderItem[]) => {
    const itemsToMove = availableReadyItems.filter(i => selectedItems.has(i.id));
    const finalItems = itemsToMove.length > 0 ? itemsToMove : availableReadyItems;
    const itemIds = finalItems.map(i => i.id);
    try {
      await api.patch(`/orders/${orderId}/items/status`, { itemIds, status: 'SERVED' });
      addToast('success', `Marked ${itemIds.length} item(s) as served`);
      setSelectedItems(new Set()); 
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); }
  };

  const handleInitiatePayment = async (orderId: string, method: string) => {
    try {
      const { data } = await api.post('/payments', { orderId, method });
      if (method === 'UPI' && data.upiQrData) {
        setActiveUpiPayment(data);
      } else if (method === 'CASH') {
        addToast('success', 'Cash payment pending. Hand to Cashier.');
      } else {
        addToast('success', `${method} payment initiated`);
      }
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err: any) { addToast('error', err.response?.data?.error || 'Failed to process payment'); }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="w-5 h-5 text-neon-mint" />
        <h1 className="text-2xl font-black tracking-[-0.02em] text-white uppercase">My Orders</h1>
        {orders.length > 0 && (
          <span className="text-[10px] font-black uppercase tracking-[0.1em] px-2 py-1 bg-[rgba(0,255,179,0.1)] border border-[rgba(0,255,179,0.2)] rounded text-neon-mint">
            {orders.length} active
          </span>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="p-14 text-center bg-surface-2 border border-edge rounded" style={{ boxShadow: '4px 4px 0px #00FFB3' }}>
          <ClipboardList className="w-10 h-10 text-neon-mint mx-auto mb-4" />
          <p className="text-xs text-ink-muted font-medium">No active orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {orders.map(order => {
            const items = order.items || [];
            const allItemsServed = items.length > 0 && items.every((i: any) => i.itemStatus === 'SERVED');
            const readyItems = items.filter((i: any) => i.itemStatus === 'READY');
            const selectedReadyCount = readyItems.filter((i: any) => selectedItems.has(i.id)).length;
            const paymentStatus = order.payment?.status || 'UNPAID';
            const paymentMethod = order.payment?.method || null;
            const isPaid = paymentStatus === 'PAID';
            const totalAmount = items.reduce((s: number, i: any) => s + (i.subtotal || 0) + (i.taxAmount || 0), 0);

            return (
              <div
                key={order.id}
                className="bg-surface-2 border border-edge rounded p-5"
                style={{ boxShadow: `4px 4px 0px ${isPaid ? '#00FFB3' : readyItems.length > 0 ? '#FF6B2B' : '#2A2A2A'}` }}
              >
                {/* Order Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-mono text-xs font-bold text-ink-primary">{order.orderNumber}</h3>
                    <p className="text-[10px] text-ink-muted mt-0.5">
                      Table {order.table?.number} · {formatTime(order.createdAt)}
                    </p>
                  </div>
                  <Badge variant={orderStatusVariant(order.status)} dot>{order.status}</Badge>
                </div>

                {/* Payment Status */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  <Badge variant={isPaid ? 'success' : paymentStatus === 'PENDING' ? 'warning' : 'neutral'}>
                    {isPaid ? `${paymentMethod || 'ONLINE'} PAID` : paymentStatus}
                  </Badge>
                  {isPaid && paymentMethod === 'UPI' && <Badge variant="info">Online Payment</Badge>}
                </div>

                {/* Items */}
                <div className="space-y-1 mb-4 bg-surface-1 p-3 rounded border border-edge">
                  <h4 className="text-[9px] font-black tracking-[0.12em] uppercase text-ink-muted mb-2">Items</h4>
                  {items.map((item: any) => {
                    const isReady = item.itemStatus === 'READY';
                    const isSelected = selectedItems.has(item.id);
                    const statusColor = itemStatusColor[item.itemStatus || 'PENDING'];
                    return (
                      <div key={item.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isReady ? (
                            <button
                              onClick={() => toggleItemSelection(item.id)}
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-neon-pink border-neon-pink' : 'border-edge'}`}
                            >
                              {isSelected && <CheckSquare className="w-3 h-3 text-white" />}
                            </button>
                          ) : (
                            <div className="w-4 h-4" />
                          )}
                          <span className={`text-xs ${item.itemStatus === 'SERVED' ? 'line-through text-ink-muted' : 'text-ink-primary'}`}>
                            <span className="font-black">{item.quantity}×</span> {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className="text-[9px] font-black uppercase tracking-[0.06em] px-1.5 py-0.5 rounded"
                            style={{ color: statusColor, backgroundColor: `${statusColor}18`, border: `1px solid ${statusColor}25` }}
                          >
                            {item.itemStatus || 'PENDING'}
                          </span>
                          <span className="text-[10px] font-bold text-ink-secondary w-14 text-right">{formatCurrency(item.subtotal)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="flex items-end justify-between pt-3 border-t border-edge">
                  <div>
                    <div className="text-[10px] text-ink-muted">
                      Subtotal: {formatCurrency(items.reduce((s: number, i: any) => s + (i.subtotal || 0), 0))}
                    </div>
                    <div className="text-[10px] text-ink-muted">
                      Tax: {formatCurrency(items.reduce((s: number, i: any) => s + (i.taxAmount || 0), 0))}
                    </div>
                    <div className="text-base font-black text-neon-pink mt-1">
                      {formatCurrency(totalAmount)}
                    </div>
                  </div>

                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {readyItems.length > 0 && (
                      <Button
                        size="sm"
                        icon={selectedReadyCount > 0 ? <CheckSquare className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        onClick={() => handleMarkServed(order.id, readyItems)}
                      >
                        {selectedReadyCount > 0 ? `Serve ${selectedReadyCount}` : 'Serve All'}
                      </Button>
                    )}

                    {allItemsServed && !isPaid && order.status !== 'PAYMENT_PENDING' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setActiveBillOrder(order)}>Bill</Button>
                        <Button size="sm" variant="outline" icon={<Banknote className="w-3 h-3" />} onClick={() => handleInitiatePayment(order.id, 'CASH')}>Cash</Button>
                        <Button size="sm" variant="outline" icon={<CreditCard className="w-3 h-3" />} onClick={() => handleInitiatePayment(order.id, 'CARD')}>Card</Button>
                        <Button size="sm" variant="outline" icon={<QrCode className="w-3 h-3" />} onClick={() => handleInitiatePayment(order.id, 'UPI')}>UPI</Button>
                      </>
                    )}

                    {!isPaid && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<MoveRight className="w-3.5 h-3.5" />}
                        onClick={() => setTransferOrder(order)}
                        className="bg-surface-3 hover:bg-[rgba(255,45,120,0.15)] hover:text-neon-pink"
                      >
                        Transfer
                      </Button>
                    )}

                    {!isPaid && order.status === 'PAYMENT_PENDING' && (
                      <Badge variant="warning" dot>Awaiting Payment</Badge>
                    )}

                    {isPaid && (
                      <Badge variant="success" dot>Payment Received</Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BillModal order={activeBillOrder} onClose={() => setActiveBillOrder(null)} />
      {activeUpiPayment && (
        <UpiQrModal upiData={activeUpiPayment.upiQrData} amount={activeUpiPayment.amount} onClose={() => setActiveUpiPayment(null)} />
      )}

      {transferOrder && (
        <TransferOrderModal
          isOpen={!!transferOrder}
          onClose={() => setTransferOrder(null)}
          orderId={transferOrder.id}
          currentTableId={transferOrder.tableId}
          currentTableNumber={transferOrder.table?.number || 0}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['orders'] })}
        />
      )}
    </div>
  );
}
