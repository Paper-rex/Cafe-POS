import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToastStore } from '../../store/useToastStore';
import { formatDuration } from '../../lib/formatters';
import { ChevronRight, Clock, CheckSquare, Flame, ChefHat, CheckCircle } from 'lucide-react';
import api from '../../lib/api';
import { useSSE } from '../../hooks/useSSE';
import type { Order, OrderItem } from '../../types';

const columns = [
  { status: 'PENDING', label: 'Pending', accentColor: '#FFE600', icon: Clock, badge: 'warning' as const, next: 'COOKING' },
  { status: 'COOKING', label: 'Cooking', accentColor: '#FF6B2B', icon: Flame, badge: 'warning' as const, next: 'READY' },
  { status: 'READY', label: 'Ready', accentColor: '#00FFB3', icon: CheckCircle, badge: 'success' as const, next: null },
];

export default function KitchenQueue() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [, setTick] = useState(0);
  const addToast = useToastStore((s) => s.addToast);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders');
      const sentOrders = data.filter((o: Order) => o.status === 'SENT');
      for (const o of sentOrders) {
        try { await api.patch(`/orders/${o.id}/status`, { status: 'PENDING' }); } catch { }
      }
      if (sentOrders.length > 0) {
        const { data: refreshed } = await api.get('/orders');
        setOrders(refreshed);
      } else {
        setOrders(data);
      }
    } catch { }
  };

  useSSE({ onOrderCreated: fetchOrders, onOrderStatusUpdated: fetchOrders, onOrderItemUpdated: fetchOrders });
  useEffect(() => { fetchOrders(); }, []);
  useEffect(() => { const i = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(i); }, []);

  const activeKitchenOrders = orders.filter(
    (o) => !['SERVED', 'PAYMENT_PENDING', 'PAID', 'CANCELLED'].includes(o.status)
  );

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const moveSelectedItems = async (orderId: string, nextStatus: string, availableItems: OrderItem[]) => {
    const itemsToMove = availableItems.filter(i => selectedItems.has(i.id));
    const finalItems = itemsToMove.length > 0 ? itemsToMove : availableItems;
    const itemIds = finalItems.map(i => i.id);
    try {
      await api.patch(`/orders/${orderId}/items/status`, { itemIds, status: nextStatus });
      addToast('success', `Moved ${itemIds.length} items to ${nextStatus}`);
      setSelectedItems(new Set());
      fetchOrders();
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed to update items');
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="w-6 h-6 text-neon-pink" />
          <h1 className="text-2xl font-black tracking-[-0.02em] text-white uppercase">Kitchen Queue</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="status-dot active" />
          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-neon-mint">Live</span>
          <span className="text-[10px] text-ink-muted ml-2">
            {activeKitchenOrders.length} active order{activeKitchenOrders.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-180px)]">
        {columns.map((col) => {
          const ColIcon = col.icon;
          const colOrders = activeKitchenOrders
            .map(o => ({ ...o, items: o.items.filter(i => i.itemStatus === col.status) }))
            .filter(o => o.items.length > 0);
          const totalItems = colOrders.reduce((sum, o) => sum + o.items.length, 0);

          return (
            <div
              key={col.status}
              className="rounded border border-edge overflow-y-auto p-3 flex flex-col gap-2"
              style={{ backgroundColor: '#0D0D0D', borderTop: `2px solid ${col.accentColor}` }}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-1 px-1 shrink-0">
                <div className="flex items-center gap-2">
                  <ColIcon className="w-4 h-4" style={{ color: col.accentColor }} />
                  <h2 className="text-xs font-black tracking-[0.08em] uppercase text-white">{col.label}</h2>
                </div>
                <Badge variant={col.badge}>{totalItems} items</Badge>
              </div>

              <AnimatePresence>
                {colOrders.map((order) => {
                  const elapsed = Date.now() - new Date(order.updatedAt).getTime();
                  const isUrgent = col.status === 'PENDING' && elapsed > 15 * 60 * 1000;
                  const selectedInGroup = order.items.filter(i => selectedItems.has(i.id)).length;

                  return (
                    <motion.div
                      key={`${order.id}-${col.status}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      layout
                    >
                      <div
                        className={`bg-surface-2 border rounded p-3 ${isUrgent ? 'border-danger animate-pulse-soft' : 'border-edge'}`}
                        style={isUrgent ? {} : { boxShadow: `2px 2px 0px ${col.accentColor}` }}
                      >
                        {/* Order Header */}
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="font-mono text-xs font-bold text-ink-primary">{order.orderNumber}</span>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded border"
                              style={{ color: col.accentColor, borderColor: `${col.accentColor}30`, backgroundColor: `${col.accentColor}10` }}
                            >
                              T{order.table?.number}
                            </span>
                            <span className="text-[10px] text-ink-muted flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {formatDuration(order.updatedAt)}
                            </span>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="space-y-1.5 mb-3">
                          {order.items.map(item => {
                            const isSelected = selectedItems.has(item.id);
                            return (
                              <label
                                key={item.id}
                                className={`flex items-center gap-2 cursor-pointer p-1.5 rounded transition-colors ${isSelected ? 'bg-[rgba(255,45,120,0.08)]' : 'hover:bg-surface-3'}`}
                                onClick={(e) => { e.preventDefault(); toggleItemSelection(item.id); }}
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-neon-pink border-neon-pink' : 'border-edge'}`}>
                                  {isSelected && <CheckSquare className="w-3 h-3 text-white" />}
                                </div>
                                <span className={`text-xs font-semibold ${isSelected ? 'text-neon-pink' : 'text-ink-primary'}`}>
                                  <span className="font-black">{item.quantity}×</span> {item.name}
                                </span>
                              </label>
                            );
                          })}
                        </div>

                        {/* Move Button */}
                        {col.next && (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => moveSelectedItems(order.id, col.next!, order.items)}
                            icon={selectedInGroup > 0 ? <CheckSquare className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          >
                            {selectedInGroup > 0
                              ? `Move ${selectedInGroup} to ${col.next}`
                              : col.next === 'COOKING' ? 'Start All' : 'Mark Ready'}
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {colOrders.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center py-8 gap-3">
                  <ColIcon className="w-8 h-8 opacity-20" style={{ color: col.accentColor }} />
                  <p className="text-xs text-ink-muted font-medium">
                    {col.status === 'PENDING' ? 'All caught up! 🎉' : 'Nothing yet'}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
