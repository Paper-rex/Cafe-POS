import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageLoader } from '../../components/ui/Spinner';
import { useSSE } from '../../hooks/useSSE';
import api from '../../lib/api';
import type { Floor } from '../../types';
import TransferOrderModal from '../../components/shared/TransferOrderModal';
import { MoveRight } from 'lucide-react';

const shapeStyles: Record<string, string> = { ROUND: 'rounded-full', SQUARE: 'rounded', RECTANGLE: 'rounded' };
const shapeSizes: Record<string, string> = { ROUND: 'w-20 h-20', SQUARE: 'w-20 h-20', RECTANGLE: 'w-28 h-16' };

import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function FloorView() {
  const queryClient = useQueryClient();
  const [activeFloor, setActiveFloor] = useState(0);
  const [transferTable, setTransferTable] = useState<any | null>(null);
  const navigate = useNavigate();

  const { data: floors = [], isLoading: loading } = useQuery({
    queryKey: ['floors'],
    queryFn: async () => {
      const { data } = await api.get<Floor[]>('/floors');
      return data;
    },
  });

  useSSE({
    onOrderCreated: () => queryClient.invalidateQueries({ queryKey: ['floors'] }),
    onOrderStatusUpdated: () => queryClient.invalidateQueries({ queryKey: ['floors'] }),
    onOrderReadyToServe: () => queryClient.invalidateQueries({ queryKey: ['floors'] }),
    onPaymentConfirmed: () => queryClient.invalidateQueries({ queryKey: ['floors'] }),
    onOrderItemUpdated: () => queryClient.invalidateQueries({ queryKey: ['floors'] }),
  });

  if (loading) return <PageLoader />;
  const currentFloor = floors[activeFloor];

  return (
    <div>
      {/* Floor Tabs */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        {floors.map((f, i) => (
          <button
            key={f.id}
            onClick={() => setActiveFloor(i)}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wide rounded whitespace-nowrap transition-all ${
              i === activeFloor
                ? 'bg-neon-pink text-white'
                : 'bg-surface-2 text-ink-muted border border-edge hover:text-ink-secondary'
            }`}
            style={i === activeFloor ? { boxShadow: '2px 2px 0px rgba(255,45,120,0.4)' } : {}}
          >
            {f.name}
          </button>
        ))}
      </div>

      {currentFloor && (
        <div className="relative min-h-[600px] bg-surface-1 border border-edge rounded overflow-hidden"
             style={{ boxShadow: '4px 4px 0px #FF2D78' }}>
          <div
            className="absolute inset-0"
            style={{ backgroundImage: 'radial-gradient(circle, #1A1A1A 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          >
            {currentFloor.tables.map((table) => {
              const isOccupied = table.isOccupied === true;
              return (
                <div
                  key={table.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${table.posX}%`, top: `${table.posY}%` }}
                >
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(`/waiter/order?tableId=${table.id}&tableNumber=${table.number}`)}
                    className="cursor-pointer"
                  >
                    <div
                      className={`${shapeSizes[table.shape]} ${shapeStyles[table.shape]} flex flex-col items-center justify-center transition-all border-2`}
                      style={{
                        backgroundColor: isOccupied ? 'rgba(255,59,92,0.12)' : 'rgba(0,255,179,0.1)',
                        borderColor: isOccupied ? '#FF3B5C' : '#00FFB3',
                        boxShadow: isOccupied ? '3px 3px 0px #FF3B5C' : '3px 3px 0px #00FFB3',
                      }}
                    >
                      <span className="text-sm font-black text-white">T{table.number}</span>
                      <span className="text-[10px] font-bold mt-0.5" style={{ color: isOccupied ? '#FF3B5C' : '#00FFB3' }}>
                        {isOccupied ? 'Occupied' : `${table.seats}s`}
                      </span>
                    </div>
                    {isOccupied && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTransferTable(table);
                        }}
                        className="absolute -top-3 -right-3 w-7 h-7 bg-surface-2 border border-edge rounded-full flex items-center justify-center shadow-lg hover:bg-neon-pink hover:text-white transition-all z-20 group-hover:scale-110"
                        title="Transfer Table"
                      >
                        <MoveRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </motion.div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 right-4 flex items-center gap-4 bg-surface-2 border border-edge px-4 py-2 rounded">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-neon-mint" />
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-secondary">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-danger" />
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-secondary">Occupied</span>
            </div>
          </div>
        </div>
      )}

      {transferTable && (
        <TransferOrderModal
          isOpen={!!transferTable}
          onClose={() => setTransferTable(null)}
          orderId={transferTable.activeOrderId}
          currentTableId={transferTable.id}
          currentTableNumber={transferTable.number}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['floors'] })}
        />
      )}
    </div>
  );
}
