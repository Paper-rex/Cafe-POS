import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { X, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import api from '../../lib/api';
import type { Floor, Order } from '../../types';
import { useToastStore } from '../../store/useToastStore';

interface TransferOrderModalProps {
  orderId: string;
  currentTableId: string;
  currentTableNumber: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newTableId: string) => void;
}

export default function TransferOrderModal({
  orderId,
  currentTableId,
  currentTableNumber,
  isOpen,
  onClose,
  onSuccess
}: TransferOrderModalProps) {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOpen) return;
    
    const fetchFloors = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/floors');
        setFloors(data);
      } catch (err) {
        addToast('error', 'Failed to load tables');
      } finally {
        setLoading(false);
      }
    };

    fetchFloors();
  }, [isOpen]);

  const transferMutation = useMutation({
    mutationFn: async (newTableId: string) => {
      const { data } = await api.patch(`/orders/${orderId}/transfer`, { newTableId });
      return data;
    },
    onMutate: async (newTableId) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      await queryClient.cancelQueries({ queryKey: ['floors'] });

      // Snapshot the previous value
      const previousOrders = queryClient.getQueryData<Order[]>(['orders']);
      const previousFloors = queryClient.getQueryData<Floor[]>(['floors']);

      // Optimistically update to the new value
      if (previousOrders) {
        queryClient.setQueryData<Order[]>(['orders'], (old) => 
          old?.map(o => o.id === orderId ? { ...o, tableId: newTableId } : o)
        );
      }

      if (previousFloors) {
        queryClient.setQueryData<Floor[]>(['floors'], (old) => 
          old?.map(f => ({
            ...f,
            tables: f.tables.map(t => {
              if (t.id === currentTableId) return { ...t, isOccupied: false };
              if (t.id === newTableId) return { ...t, isOccupied: true };
              return t;
            })
          }))
        );
      }

      return { previousOrders, previousFloors };
    },
    onError: (err: any, _newTableId, context) => {
      // Rollback to the previous state
      if (context?.previousOrders) {
        queryClient.setQueryData(['orders'], context.previousOrders);
      }
      if (context?.previousFloors) {
        queryClient.setQueryData(['floors'], context.previousFloors);
      }
      addToast('error', err.response?.data?.error || 'Transfer failed');
    },
    onSuccess: () => {
      addToast('success', 'Order transferred successfully');
      onSuccess?.(selectedTableId!);
      onClose();
    },
    onSettled: () => {
      // Always refetch after error or success to keep server sync
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['floors'] });
    },
  });

  const handleTransfer = async () => {
    if (!selectedTableId || transferMutation.isPending) return;
    transferMutation.mutate(selectedTableId);
  };

  const selectedTable = floors.flatMap(f => f.tables).find(t => t.id === selectedTableId);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-surface-1 border border-edge rounded-lg overflow-hidden flex flex-col max-h-[90vh]"
            style={{ boxShadow: '8px 8px 0px #FF2D78', borderTop: '4px solid #FF2D78' }}
          >
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-edge">
              <div>
                <h3 className="text-sm font-black tracking-[0.1em] uppercase text-white">Transfer Order</h3>
                <p className="text-[10px] text-ink-muted mt-0.5 font-bold uppercase tracking-widest">
                  Moving from T{currentTableNumber}
                </p>
              </div>
              <button onClick={onClose} className="p-2 text-ink-muted hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-neon-pink animate-spin" />
                  <p className="text-xs font-bold text-ink-muted uppercase tracking-widest">Loading Tables...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {floors.map((floor) => (
                    <div key={floor.id}>
                      <h4 className="text-[10px] font-black tracking-[0.2em] uppercase text-neon-pink mb-4 border-b border-edge/30 pb-2">
                        {floor.name}
                      </h4>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                        {floor.tables.map((table) => {
                          const isCurrent = table.id === currentTableId;
                          const isOccupied = table.isOccupied;
                          const isSelected = table.id === selectedTableId;

                          return (
                            <button
                              key={table.id}
                              disabled={isCurrent || isOccupied}
                              onClick={() => setSelectedTableId(table.id)}
                              className={`
                                relative aspect-square flex flex-col items-center justify-center rounded border transition-all
                                ${isSelected 
                                  ? 'bg-neon-pink border-neon-pink text-white scale-110 z-10' 
                                  : isCurrent
                                    ? 'bg-surface-3 border-edge opacity-40 cursor-not-allowed'
                                    : isOccupied
                                      ? 'bg-[rgba(255,59,92,0.1)] border-[rgba(255,59,92,0.3)] text-danger cursor-not-allowed'
                                      : 'bg-surface-2 border-edge text-ink-secondary hover:border-neon-pink hover:text-neon-pink'
                                }
                              `}
                              style={isSelected ? { boxShadow: '4px 4px 0px rgba(0,0,0,0.3)' } : {}}
                            >
                              <span className="text-xs font-black">T{table.number}</span>
                              <span className="text-[8px] font-bold opacity-60">{table.seats}S</span>
                              {isOccupied && !isCurrent && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-edge bg-surface-2 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-ink-muted uppercase tracking-widest">Source</span>
                  <span className="text-xs font-bold text-white">Table {currentTableNumber}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-neon-pink" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-ink-muted uppercase tracking-widest">Target</span>
                  <span className={`text-xs font-bold ${selectedTable ? 'text-neon-pink' : 'text-ink-muted'}`}>
                    {selectedTable ? `Table ${selectedTable.number}` : 'Select Table'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!selectedTableId || transferMutation.isPending}
                  loading={transferMutation.isPending}
                  onClick={handleTransfer}
                  style={{ boxShadow: '4px 4px 0px rgba(255,45,120,0.4)' }}
                >
                  Confirm Transfer
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
