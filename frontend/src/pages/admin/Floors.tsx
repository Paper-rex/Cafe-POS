import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/Spinner';
import { useToastStore } from '../../store/useToastStore';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import type { Floor } from '../../types';

const shapeStyles: Record<string, string> = {
  ROUND: 'rounded-full',
  SQUARE: 'rounded-xl',
  RECTANGLE: 'rounded-xl',
};
const shapeSize: Record<string, string> = {
  ROUND: 'w-16 h-16',
  SQUARE: 'w-16 h-16',
  RECTANGLE: 'w-24 h-14',
};

export default function Floors() {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFloor, setActiveFloor] = useState(0);
  const [showAddFloor, setShowAddFloor] = useState(false);
  const [showAddTable, setShowAddTable] = useState(false);
  const [floorName, setFloorName] = useState('');
  const [tableForm, setTableForm] = useState({ number: '', seats: '4', shape: 'SQUARE' });
  const addToast = useToastStore((s) => s.addToast);

  const fetchFloors = async () => {
    try { const { data } = await api.get('/floors'); setFloors(data); } catch {} finally { setLoading(false); }
  };
  useEffect(() => { fetchFloors(); }, []);

  const handleAddFloor = async () => {
    if (!floorName) return;
    try { await api.post('/floors', { name: floorName }); addToast('success', 'Floor created'); setShowAddFloor(false); setFloorName(''); fetchFloors(); }
    catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); }
  };

  const handleAddTable = async () => {
    const floor = floors[activeFloor];
    if (!floor || !tableForm.number) return;
    try {
      await api.post(`/floors/${floor.id}/tables`, { number: parseInt(tableForm.number), seats: parseInt(tableForm.seats), shape: tableForm.shape });
      addToast('success', 'Table added'); setShowAddTable(false); setTableForm({ number: '', seats: '4', shape: 'SQUARE' }); fetchFloors();
    } catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('Delete this table?')) return;
    try { await api.delete(`/floors/tables/${tableId}`); addToast('success', 'Table deleted'); fetchFloors(); }
    catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <PageLoader />;

  const currentFloor = floors[activeFloor];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="font-display text-3xl font-bold text-text-primary">Floors & Tables</h1><p className="text-text-secondary mt-1">Manage your restaurant layout</p></div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowAddFloor(true)} icon={<Plus className="w-4 h-4" />}>Add Floor</Button>
          {currentFloor && <Button onClick={() => setShowAddTable(true)} icon={<Plus className="w-4 h-4" />}>Add Table</Button>}
        </div>
      </div>

      {/* Floor Tabs */}
      <div className="flex gap-2 mb-6">
        {floors.map((floor, i) => (
          <button key={floor.id} onClick={() => setActiveFloor(i)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              i === activeFloor ? 'bg-brand-main text-white' : 'bg-white text-text-secondary border border-border hover:bg-surface-2'
            }`}>{floor.name} ({floor.tables.length})</button>
        ))}
      </div>

      {/* Floor Canvas */}
      {currentFloor ? (
        <Card className="p-6 relative min-h-[500px] bg-surface-1/50">
          <div className="absolute inset-6" style={{ backgroundImage: 'radial-gradient(circle, #DDE8E2 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
            {currentFloor.tables.map((table) => (
              <div key={table.id}
                className="absolute group cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110"
                style={{ left: `${table.posX}%`, top: `${table.posY}%` }}>
                <div className={`${shapeSize[table.shape]} ${shapeStyles[table.shape]} bg-brand-pale border-2 border-brand-light flex flex-col items-center justify-center text-brand-dark`}>
                  <span className="text-xs font-bold">T{table.number}</span>
                  <span className="text-[10px] text-brand-main">{table.seats}s</span>
                </div>
                <button onClick={() => handleDeleteTable(table.id)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-danger text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-text-muted">No floors yet. Create one to get started.</p>
        </Card>
      )}

      <Modal isOpen={showAddFloor} onClose={() => setShowAddFloor(false)} title="Add Floor" size="sm">
        <div className="p-6 space-y-4">
          <Input label="Floor Name" placeholder="Ground Floor" value={floorName} onChange={(e) => setFloorName(e.target.value)} required />
          <div className="flex gap-3 pt-2"><Button variant="ghost" onClick={() => setShowAddFloor(false)} className="flex-1">Cancel</Button><Button onClick={handleAddFloor} className="flex-1">Create</Button></div>
        </div>
      </Modal>

      <Modal isOpen={showAddTable} onClose={() => setShowAddTable(false)} title="Add Table" size="sm">
        <div className="p-6 space-y-4">
          <Input label="Table Number" type="number" placeholder="1" value={tableForm.number} onChange={(e) => setTableForm(f => ({ ...f, number: e.target.value }))} required />
          <Input label="Seats" type="number" placeholder="4" value={tableForm.seats} onChange={(e) => setTableForm(f => ({ ...f, seats: e.target.value }))} />
          <div><label className="block text-sm font-medium text-text-secondary mb-1.5">Shape</label>
            <select value={tableForm.shape} onChange={(e) => setTableForm(f => ({ ...f, shape: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm">
              <option value="SQUARE">Square</option><option value="ROUND">Round</option><option value="RECTANGLE">Rectangle</option>
            </select></div>
          <div className="flex gap-3 pt-2"><Button variant="ghost" onClick={() => setShowAddTable(false)} className="flex-1">Cancel</Button><Button onClick={handleAddTable} className="flex-1">Add Table</Button></div>
        </div>
      </Modal>
    </div>
  );
}
