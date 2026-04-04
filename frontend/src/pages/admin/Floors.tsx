import { useEffect, useState, useRef } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/Spinner';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useToastStore } from '../../store/useToastStore';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import type { Floor } from '../../types';
import { useBranchStore } from '../../store/useBranchStore';

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
      setShowAddFloor(false);
      setFloorName('');
      fetchFloors();
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed');
    }
  };

  const handleAddTable = async () => {
    const floor = floors[activeFloor];
    if (!floor || !tableForm.number) return;
    try {
      await api.post(`/floors/${floor.id}/tables`, {
        number: parseInt(tableForm.number),
        seats: parseInt(tableForm.seats),
        shape: tableForm.shape,
        posX: pendingPos.posX,
        posY: pendingPos.posY,
      });
      addToast('success', 'Table added');
      setShowAddTable(false);
      setTableForm({ number: '', seats: '4', shape: 'SQUARE' });
      fetchFloors();
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed');
    }
  };

  const handleDeleteTable = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.delete(`/floors/tables/${deleteConfirmId}`);
      addToast('success', 'Table deleted');
      setDeleteConfirmId(null);
      fetchFloors();
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Delete failed: Orders might be active');
      setDeleteConfirmId(null);
    }
  };

  // --- Drag and Drop Handlers ---
  const handlePointerDown = (e: React.PointerEvent, tableId: string) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    if (target.closest('button')) return; // ignore delete context clicks

    draggingIdRef.current = tableId;
    if (canvasRef.current) {
      canvasRef.current.setPointerCapture(e.pointerId);
    }
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
      if (tableIndex > -1) {
        floor.tables[tableIndex] = { ...floor.tables[tableIndex], posX: x, posY: y };
      }
      return newFloors;
    });
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (!draggingIdRef.current) return;
    if (canvasRef.current) {
      canvasRef.current.releasePointerCapture(e.pointerId);
    }

    const tableId = draggingIdRef.current;
    draggingIdRef.current = null;

    const floor = floors[activeFloor];
    const table = floor.tables.find((t: any) => t.id === tableId);
    if (table) {
      try {
        await api.patch(`/floors/tables/${table.id}`, { posX: table.posX, posY: table.posY });
        addToast('success', 'Position saved');
      } catch (err) {
        addToast('error', 'Failed to save position');
      }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (wasDraggingRef.current) {
      wasDraggingRef.current = false;
      return;
    }
    if ((e.target as HTMLElement).closest('.table-component')) return;
    if (!canvasRef.current) return;
    // Find the current bounding box
    const rect = canvasRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Default form configuration with coordinates from click
    setPendingPos({ posX: x, posY: y });
    setShowAddTable(true);
  };

  if (loading) return <PageLoader />;

  const currentFloor = floors[activeFloor];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">Floors & Tables</h1>
          <p className="text-text-secondary mt-1">Manage your restaurant layout</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowAddFloor(true)} icon={<Plus className="w-4 h-4" />}>Add Floor</Button>
          {currentFloor && (
            <Button onClick={() => {
              setPendingPos({ posX: 50, posY: 50 });
              setShowAddTable(true);
            }} icon={<Plus className="w-4 h-4" />}>
              Add Table
            </Button>
          )}
        </div>
      </div>

      {/* Floor Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {floors.map((floor, i) => (
          <button key={floor.id} onClick={() => setActiveFloor(i)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${i === activeFloor ? 'bg-brand-main text-white' : 'bg-white text-text-secondary border border-border hover:bg-surface-2'
              }`}>
            {floor.name} ({floor.tables.length})
          </button>
        ))}
      </div>

      {/* Visual Legend */}
      {currentFloor && (
        <div className="flex gap-4 mb-4 text-sm text-text-secondary items-center">
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full border border-border bg-white" /> Round</div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-[4px] border border-border bg-white" /> Square</div>
          <div className="flex items-center gap-1.5"><div className="w-6 h-4 rounded-[4px] border border-border bg-white" /> Rectangle</div>
          <div className="ml-auto text-xs opacity-70 border bg-white px-2 py-1 rounded-md">Click anywhere on the map to place a new table</div>
        </div>
      )}

      {/* Floor Canvas */}
      {currentFloor ? (
        <Card className="p-0 overflow-hidden relative min-h-[600px] bg-surface-1/50 border border-border">
          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="absolute inset-0 cursor-crosshair touch-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #DDE8E2 1.5px, transparent 1.5px)',
              backgroundSize: '30px 30px'
            }}
          >
            {currentFloor.tables.map((table: any) => (
              <div 
                key={table.id}
                onPointerDown={(e) => {
                  wasDraggingRef.current = false;
                  handlePointerDown(e, table.id);
                }}
                onClick={(e) => e.stopPropagation()}
                className="absolute group z-10 hover:z-20 transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing table-component"
                style={{ left: `${table.posX}%`, top: `${table.posY}%` }}
              >
                <div className={`${shapeSize[table.shape]} ${shapeStyles[table.shape]} shadow-sm hover:shadow-md transition-shadow bg-brand-pale border-2 border-brand-light flex flex-col items-center justify-center text-brand-dark`}>
                  <span className="text-sm font-bold flex items-center gap-1">T{table.number}</span>
                  <span className="text-[10px] text-brand-main/80 font-medium">{table.seats} Seats</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(table.id); }}
                  className="absolute -top-3 -right-3 w-6 h-6 bg-danger text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:scale-110"
                >
                  <Trash2 className="w-3.5 h-3.5" />
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
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddFloor(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleAddFloor} className="flex-1">Create</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showAddTable} onClose={() => setShowAddTable(false)} title="Add Table" size="sm">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Table Number" type="number" placeholder="1" value={tableForm.number} onChange={(e) => setTableForm(f => ({ ...f, number: e.target.value }))} required />
            <Input label="Seats" type="number" placeholder="4" value={tableForm.seats} onChange={(e) => setTableForm(f => ({ ...f, seats: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Shape</label>
            <div className="grid grid-cols-3 gap-3">
              {(['SQUARE', 'ROUND', 'RECTANGLE'] as const).map(shape => (
                <button
                  key={shape}
                  type="button"
                  onClick={() => setTableForm(f => ({ ...f, shape }))}
                  className={`py-2 rounded-xl text-xs font-medium border transition-colors ${tableForm.shape === shape ? 'border-brand-main bg-brand-pale text-brand-dark' : 'border-border bg-white text-text-secondary hover:bg-surface-2'}`}
                >
                  {shape.charAt(0) + shape.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowAddTable(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleAddTable} className="flex-1">Add Table</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDeleteTable}
        title="Delete Table"
        message="Are you sure you want to delete this table? This action cannot be undone."
        confirmLabel="Delete Table"
      />
    </div>
  );
}
