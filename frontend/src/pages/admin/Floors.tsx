import { useEffect, useState, useRef } from 'react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/Spinner';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useToastStore } from '../../store/useToastStore';
import { Plus, Trash2, Map } from 'lucide-react';
import api from '../../lib/api';
import type { Floor } from '../../types';
import { useBranchStore } from '../../store/useBranchStore';

const shapeStyles: Record<string, string> = {
  ROUND: 'rounded-full',
  SQUARE: 'rounded',
  RECTANGLE: 'rounded',
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
  const [pendingPos, setPendingPos] = useState({ posX: 50, posY: 50 });
  const [tableForm, setTableForm] = useState({ number: '', seats: '4', shape: 'SQUARE' });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const draggingIdRef = useRef<string | null>(null);
  const wasDraggingRef = useRef(false);

  const selectedBranchId = useBranchStore((s) => s.selectedBranchId);
  const addToast = useToastStore((s) => s.addToast);

  const fetchFloors = async () => {
    if (!selectedBranchId) return;
    try {
      const { data } = await api.get(`/floors?branchId=${selectedBranchId}`);
      setFloors(data);
    } catch {
      addToast('error', 'Failed to load floors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFloors(); }, [selectedBranchId]);

  const handleAddFloor = async () => {
    if (!floorName || !selectedBranchId) return;
    try {
      await api.post('/floors', { name: floorName, branchId: selectedBranchId });
      addToast('success', 'Floor created');
      setShowAddFloor(false); setFloorName(''); fetchFloors();
    } catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); }
  };

  const handleAddTable = async () => {
    const floor = floors[activeFloor];
    if (!floor || !tableForm.number) return;
    try {
      await api.post(`/floors/${floor.id}/tables`, {
        number: parseInt(tableForm.number), seats: parseInt(tableForm.seats),
        shape: tableForm.shape, posX: pendingPos.posX, posY: pendingPos.posY,
      });
      addToast('success', 'Table added');
      setShowAddTable(false); setTableForm({ number: '', seats: '4', shape: 'SQUARE' }); fetchFloors();
    } catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); }
  };

  const handleDeleteTable = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.delete(`/floors/tables/${deleteConfirmId}`);
      addToast('success', 'Table deleted');
      setDeleteConfirmId(null); fetchFloors();
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Delete failed: Orders might be active');
      setDeleteConfirmId(null);
    }
  };

  const handlePointerDown = (e: React.PointerEvent, tableId: string) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    draggingIdRef.current = tableId;
    if (canvasRef.current) canvasRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingIdRef.current || !canvasRef.current) return;
    wasDraggingRef.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    setFloors(prev => {
      const newFloors = [...prev];
      const floor = newFloors[activeFloor];
      const tableIndex = floor.tables.findIndex((t: any) => t.id === draggingIdRef.current);
      if (tableIndex > -1) floor.tables[tableIndex] = { ...floor.tables[tableIndex], posX: x, posY: y };
      return newFloors;
    });
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (!draggingIdRef.current) return;
    if (canvasRef.current) canvasRef.current.releasePointerCapture(e.pointerId);
    const tableId = draggingIdRef.current;
    draggingIdRef.current = null;
    const floor = floors[activeFloor];
    const table = floor.tables.find((t: any) => t.id === tableId);
    if (table) {
      try { await api.patch(`/floors/tables/${table.id}`, { posX: table.posX, posY: table.posY }); addToast('success', 'Position saved'); }
      catch { addToast('error', 'Failed to save position'); }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (wasDraggingRef.current) { wasDraggingRef.current = false; return; }
    if ((e.target as HTMLElement).closest('.table-component')) return;
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPos({ posX: x, posY: y });
    setShowAddTable(true);
  };

  if (loading) return <PageLoader />;
  const currentFloor = floors[activeFloor];

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-7">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-neon-pink mb-1">Admin Console</p>
          <h1 className="text-3xl font-black tracking-[-0.03em] text-white uppercase">Floors & Tables</h1>
          <p className="text-xs text-ink-muted mt-1 font-medium">Design your restaurant layout</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddFloor(true)} icon={<Plus className="w-3.5 h-3.5" />} size="sm">
            Add Floor
          </Button>
          {currentFloor && (
            <Button onClick={() => { setPendingPos({ posX: 50, posY: 50 }); setShowAddTable(true); }} icon={<Plus className="w-3.5 h-3.5" />} size="sm">
              Add Table
            </Button>
          )}
        </div>
      </div>

      {/* Floor Tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {floors.map((floor, i) => (
          <button
            key={floor.id}
            onClick={() => setActiveFloor(i)}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wide rounded transition-all whitespace-nowrap ${
              i === activeFloor
                ? 'bg-neon-pink text-white'
                : 'bg-surface-2 border border-edge text-ink-muted hover:text-ink-secondary hover:border-surface-4'
            }`}
            style={i === activeFloor ? { boxShadow: '2px 2px 0px rgba(255,45,120,0.4)' } : {}}
          >
            {floor.name} <span className="ml-1 opacity-70">({floor.tables.length})</span>
          </button>
        ))}
      </div>

      {/* Legend */}
      {currentFloor && (
        <div className="flex gap-4 mb-4 text-xs text-ink-muted items-center">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full border border-edge bg-surface-2" /> Round
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border border-edge bg-surface-2" /> Square
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-4 rounded border border-edge bg-surface-2" /> Rectangle
          </div>
          <div className="ml-auto text-[10px] font-bold uppercase tracking-[0.08em] bg-surface-2 border border-edge px-3 py-1.5 rounded text-ink-muted">
            Click on map to place table
          </div>
        </div>
      )}

      {/* Floor Canvas */}
      {currentFloor ? (
        <div className="overflow-hidden relative min-h-[550px] bg-surface-1 border border-edge rounded"
             style={{ boxShadow: '4px 4px 0px #FF2D78' }}>
          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="absolute inset-0 cursor-crosshair touch-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #2A2A2A 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            {currentFloor.tables.map((table: any) => (
              <div
                key={table.id}
                onPointerDown={(e) => { wasDraggingRef.current = false; handlePointerDown(e, table.id); }}
                onClick={(e) => e.stopPropagation()}
                className="absolute group z-10 hover:z-20 transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing table-component"
                style={{ left: `${table.posX}%`, top: `${table.posY}%` }}
              >
                <div
                  className={`${shapeSize[table.shape]} ${shapeStyles[table.shape]} border-2 border-[rgba(255,45,120,0.5)] flex flex-col items-center justify-center text-white transition-all group-hover:border-neon-pink`}
                  style={{ backgroundColor: '#1A1A1A', boxShadow: '3px 3px 0px #FF2D78' }}
                >
                  <span className="text-sm font-black">T{table.number}</span>
                  <span className="text-[9px] font-bold text-ink-muted">{table.seats} Seats</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(table.id); }}
                  className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-danger text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-14 text-center bg-surface-2 border border-edge rounded" style={{ boxShadow: '4px 4px 0px #2A2A2A' }}>
          <Map className="w-10 h-10 text-ink-muted mx-auto mb-4" />
          <p className="text-xs text-ink-muted font-medium">No floors yet. Create one to get started.</p>
        </div>
      )}

      {/* Add Floor Modal */}
      <Modal isOpen={showAddFloor} onClose={() => setShowAddFloor(false)} title="Add Floor" size="sm" accentColor="#00FFB3">
        <div className="p-6 space-y-4">
          <Input label="Floor Name" placeholder="e.g. Ground Floor" value={floorName} onChange={(e) => setFloorName(e.target.value)} required />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddFloor(false)} className="flex-1 border border-edge">Cancel</Button>
            <Button onClick={handleAddFloor} className="flex-1">Create Floor</Button>
          </div>
        </div>
      </Modal>

      {/* Add Table Modal */}
      <Modal isOpen={showAddTable} onClose={() => setShowAddTable(false)} title="Add Table" size="sm">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Table Number" type="number" placeholder="1" value={tableForm.number} onChange={(e) => setTableForm(f => ({ ...f, number: e.target.value }))} required />
            <Input label="Seats" type="number" placeholder="4" value={tableForm.seats} onChange={(e) => setTableForm(f => ({ ...f, seats: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-black tracking-[0.12em] uppercase text-ink-secondary mb-2">Shape</label>
            <div className="grid grid-cols-3 gap-2">
              {(['SQUARE', 'ROUND', 'RECTANGLE'] as const).map(shape => (
                <button
                  key={shape}
                  type="button"
                  onClick={() => setTableForm(f => ({ ...f, shape }))}
                  className={`py-2 rounded text-[10px] font-black uppercase tracking-wide border transition-all ${
                    tableForm.shape === shape
                      ? 'border-neon-pink bg-[rgba(255,45,120,0.1)] text-neon-pink'
                      : 'border-edge bg-surface-2 text-ink-muted hover:bg-surface-3'
                  }`}
                >
                  {shape.charAt(0) + shape.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddTable(false)} className="flex-1 border border-edge">Cancel</Button>
            <Button onClick={handleAddTable} className="flex-1">Add Table</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} onConfirm={handleDeleteTable}
        title="Delete Table" message="Delete this table? This cannot be undone." confirmLabel="Delete Table" />
    </div>
  );
}
