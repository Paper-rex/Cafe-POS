import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { PageLoader } from '../../components/ui/Spinner';
import api from '../../lib/api';
import type { Floor } from '../../types';

const shapeStyles: Record<string, string> = { ROUND: 'rounded-full', SQUARE: 'rounded-2xl', RECTANGLE: 'rounded-2xl' };
const shapeSizes: Record<string, string> = { ROUND: 'w-20 h-20', SQUARE: 'w-20 h-20', RECTANGLE: 'w-28 h-18' };

export default function FloorView() {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [activeFloor, setActiveFloor] = useState(0);
  const [occupiedTables, setOccupiedTables] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fRes = await api.get('/floors');
        setFloors(fRes.data);
      } catch (err) {
        console.error('Failed to fetch floors:', err);
      }
      try {
        const oRes = await api.get('/orders?status=CREATED&status=SENT&status=PENDING&status=COOKING&status=READY&status=SERVED&status=PAYMENT_PENDING');
        setOccupiedTables(new Set(oRes.data.map((o: any) => o.tableId)));
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <PageLoader />;

  const currentFloor = floors[activeFloor];

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        {floors.map((f, i) => (
          <button key={f.id} onClick={() => setActiveFloor(i)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${i === activeFloor ? 'bg-brand-main text-white' : 'bg-white text-text-secondary border border-border hover:bg-surface-2'}`}>
            {f.name}
          </button>
        ))}
      </div>

      {currentFloor && (
        <Card className="relative min-h-[600px] bg-surface-1/50 p-6">
          <div className="absolute inset-6" style={{ backgroundImage: 'radial-gradient(circle, #DDE8E2 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
            {currentFloor.tables.map((table) => {
              const isOccupied = occupiedTables.has(table.id);
              return (
                <motion.div
                  key={table.id}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/waiter/order?tableId=${table.id}&tableNumber=${table.number}`)}
                  className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${table.posX}%`, top: `${table.posY}%` }}
                >
                  <div className={`${shapeSizes[table.shape]} ${shapeStyles[table.shape]} 
                    ${isOccupied ? 'bg-danger-pale border-2 border-red-300' : 'bg-success-pale border-2 border-brand-light'}
                    flex flex-col items-center justify-center shadow-card hover:shadow-card-hover transition-all`}>
                    <span className="text-sm font-bold text-text-primary">T{table.number}</span>
                    <span className={`text-[10px] mt-0.5 ${isOccupied ? 'text-danger' : 'text-brand-main'}`}>
                      {isOccupied ? 'Occupied' : `${table.seats} seats`}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="absolute bottom-6 right-6 flex items-center gap-4 bg-white/80 backdrop-blur px-4 py-2 rounded-xl border border-border">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-brand-light" /><span className="text-xs text-text-secondary">Available</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-300" /><span className="text-xs text-text-secondary">Occupied</span></div>
          </div>
        </Card>
      )}
    </div>
  );
}
