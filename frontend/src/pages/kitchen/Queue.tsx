import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToastStore } from '../../store/useToastStore';
import { formatDuration } from '../../lib/formatters';
import { ChevronRight, Clock, CheckSquare } from 'lucide-react';
import api from '../../lib/api';
import type { Order, OrderItem } from '../../types';

const columns = [
  { status: 'PENDING', label: 'Pending', color: 'border-yellow-400 bg-yellow-50', badge: 'warning' as const, next: 'COOKING' },
  { status: 'COOKING', label: 'Cooking', color: 'border-orange-400 bg-orange-50', badge: 'warning' as const, next: 'READY' },
  { status: 'READY', label: 'Ready', color: 'border-green-400 bg-green-50', badge: 'success' as const, next: null },
];

export default function KitchenQueue() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [, setTick] = useState(0);
  const addToast = useToastStore((s) => s.addToast);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders');
      // Auto-transition SENT orders to PENDING for backward compat, though the new model relies on itemStatus
      const sentOrders = data.filter((o: Order) => o.status === 'SENT');
      for (const o of sentOrders) {
        try { await api.patch(`/orders/${o.id}/status`, { status: 'PENDING' }); } catch {}
      }
      if (sentOrders.length > 0) {
        const { data: refreshed } = await api.get('/orders');
        setOrders(refreshed);
      } else {
        setOrders(data);
      }
    } catch {}
  };

  useEffect(() => { fetchOrders(); const i = setInterval(fetchOrders, 5000); return () => clearInterval(i); }, []);
  useEffect(() => { const i = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(i); }, []);

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const moveSelectedItems = async (orderId: string, nextStatus: string, availableItems: OrderItem[]) => {
    // Determine which items to move: only those selected, or if none selected, all in this column
    const itemsToMove = availableItems.filter(i => selectedItems.has(i.id));
    const finalItems = itemsToMove.length > 0 ? itemsToMove : availableItems;
    const itemIds = finalItems.map(i => i.id);

    try {
      await api.patch(`/orders/${orderId}/items/status`, { itemIds, status: nextStatus });
      addToast('success', `Moved ${itemIds.length} items to ${nextStatus}`);
      setSelectedItems(new Set()); // clear selection
      fetchOrders();
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed to update items');
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-text-primary mb-6">Kitchen Queue</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-140px)]">
        {columns.map((col) => {
          // Find orders that have at least one item in this column's status
          const colOrders = orders
            .map(o => ({ ...o, items: o.items.filter(i => i.itemStatus === col.status) }))
            .filter(o => o.items.length > 0);

          return (
            <div key={col.status} className={`rounded-2xl border-2 ${col.color} p-3 overflow-y-auto`}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="font-display font-semibold text-text-primary text-sm">{col.label}</h2>
                <Badge variant={col.badge}>{colOrders.reduce((sum, o) => sum + o.items.length, 0)} items</Badge>
              </div>
              <AnimatePresence>
                {colOrders.map((order) => {
                  const elapsed = Date.now() - new Date(order.updatedAt).getTime();
                  const isUrgent = col.status === 'PENDING' && elapsed > 15 * 60 * 1000;
                  
                  // How many items are selected in this specific group?
                  const selectedInGroup = order.items.filter(i => selectedItems.has(i.id)).length;

                  return (
                    <motion.div key={`${order.id}-${col.status}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} layout>
                      <Card className={`p-3 mb-3 ${isUrgent ? 'border-2 border-danger animate-pulse-soft' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-sm font-bold text-text-primary">{order.orderNumber}</span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="neutral">T{order.table?.number}</Badge>
                            <span className="text-xs text-text-muted flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(order.updatedAt)}</span>
                          </div>
                        </div>
                        <div className="space-y-1.5 mb-3">
                          {order.items.map(item => {
                            const isSelected = selectedItems.has(item.id);
                            return (
                              <label key={item.id} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-black/5" onClick={(e) => { e.preventDefault(); toggleItemSelection(item.id); }}>
                                <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 rounded border-border text-brand-main focus:ring-brand-pale" />
                                <span className={`text-sm ${isSelected ? 'font-medium text-brand-dark' : 'text-text-primary'}`}>
                                  {item.quantity}x {item.name}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        {col.next && (
                          <Button 
                            size="sm" 
                            className="w-full" 
                            onClick={() => moveSelectedItems(order.id, col.next!, order.items)} 
                            icon={selectedInGroup > 0 ? <CheckSquare className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          >
                            {selectedInGroup > 0 
                              ? `Move ${selectedInGroup} to ${col.next}` 
                              : col.next === 'COOKING' ? 'Start All Cooking' : 'Mark All Ready'}
                          </Button>
                        )}
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {colOrders.length === 0 && (
                <div className="text-center py-8">
                  {col.status === 'PENDING' ? <p className="text-text-muted text-sm">All caught up! 🎉</p> : <p className="text-text-muted text-sm">Empty</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
