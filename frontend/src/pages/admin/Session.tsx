import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { useToastStore } from '../../store/useToastStore';
import { Play, Square, Clock, Zap } from 'lucide-react';
import { formatDateTime, formatCurrency } from '../../lib/formatters';
import api from '../../lib/api';
import type { PosSession } from '../../types';
import { useBranchStore } from '../../store/useBranchStore';

export default function Session() {
  const [activeSession, setActiveSession] = useState<PosSession | null>(null);
  const [history, setHistory] = useState<PosSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const selectedBranchId = useBranchStore((s) => s.selectedBranchId);

  const fetchData = async () => {
    if (!selectedBranchId) return;
    try {
      const [active, hist] = await Promise.all([
        api.get(`/session/active?branchId=${selectedBranchId}`),
        api.get(`/session/history?branchId=${selectedBranchId}`)
      ]);
      setActiveSession(active.data); setHistory(hist.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [selectedBranchId]);

  const handleOpen = async () => {
    if (!selectedBranchId) return;
    setActionLoading(true);
    try { await api.post('/session/open', { branchId: selectedBranchId }); addToast('success', 'Session opened!'); fetchData(); }
    catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); } finally { setActionLoading(false); }
  };

  const handleClose = async () => {
    if (!selectedBranchId) return;
    if (!confirm('Close the current session? Staff will be blocked from creating new orders.')) return;
    setActionLoading(true);
    try { await api.post('/session/close', { branchId: selectedBranchId }); addToast('info', 'Session is closing...'); fetchData(); }
    catch (err: any) { addToast('error', err.response?.data?.error || 'Failed'); } finally { setActionLoading(false); }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-black tracking-[0.2em] uppercase text-neon-pink mb-1">Admin Console</p>
        <h1 className="text-3xl font-black tracking-[-0.03em] text-white uppercase">Session</h1>
        <p className="text-xs text-ink-muted mt-1 font-medium">Manage POS sessions for this branch</p>
      </div>

      {activeSession ? (
        <div className="p-6 mb-8 bg-surface-2 border border-edge rounded"
             style={{ boxShadow: '4px 4px 0px #00FFB3', borderTop: '2px solid #00FFB3' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-[rgba(0,255,179,0.12)] border border-[rgba(0,255,179,0.25)] rounded flex items-center justify-center">
                <Play className="w-5 h-5 text-neon-mint" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-0.5">
                  <h2 className="text-sm font-black tracking-[0.04em] uppercase text-white">Session Active</h2>
                  <Badge variant="success" dot>Live</Badge>
                </div>
                <p className="text-xs text-ink-muted">
                  Opened {formatDateTime(activeSession.openedAt)} by{' '}
                  <span className="text-ink-secondary font-medium">
                    {activeSession.openedBy?.name || activeSession.openedBy?.email}
                  </span>
                </p>
              </div>
            </div>
            <Button variant="danger" icon={<Square className="w-3.5 h-3.5" />} loading={actionLoading} onClick={handleClose}>
              Close Session
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-14 text-center mb-8 bg-surface-2 border border-edge rounded"
             style={{ boxShadow: '4px 4px 0px #FF2D78' }}>
          <div className="w-14 h-14 bg-surface-3 border border-edge rounded mx-auto flex items-center justify-center mb-5">
            <Clock className="w-7 h-7 text-ink-muted" />
          </div>
          <h2 className="text-lg font-black tracking-[-0.01em] uppercase text-white mb-2">No Active Session</h2>
          <p className="text-xs text-ink-muted mb-7 font-medium">Open a session to start taking orders at this branch</p>
          <Button size="lg" icon={<Play className="w-4 h-4" />} loading={actionLoading} onClick={handleOpen}>
            Open Session
          </Button>
        </div>
      )}

      {/* Session History */}
      {history.length > 0 && (
        <div className="bg-surface-2 border border-edge rounded overflow-hidden"
             style={{ boxShadow: '4px 4px 0px #FFE600' }}>
          <div className="px-6 py-4 border-b border-edge flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-neon-yellow" />
            <h2 className="text-xs font-black tracking-[0.1em] uppercase text-white">Session History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-edge bg-surface-1">
                  {['Opened', 'Closed', 'Opened By', 'Orders', 'Total Sales', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-black tracking-[0.12em] uppercase text-ink-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {history.map(s => (
                  <tr key={s.id} className="hover:bg-[rgba(255,45,120,0.04)] transition-colors">
                    <td className="px-5 py-3 text-xs text-ink-primary font-medium">{formatDateTime(s.openedAt)}</td>
                    <td className="px-5 py-3 text-xs text-ink-secondary">{s.closedAt ? formatDateTime(s.closedAt) : '—'}</td>
                    <td className="px-5 py-3 text-xs text-ink-secondary">{s.openedBy?.name || s.openedBy?.email}</td>
                    <td className="px-5 py-3 text-xs font-bold text-ink-primary">{s._count?.orders || 0}</td>
                    <td className="px-5 py-3 text-xs font-black text-neon-mint">{formatCurrency(s.totalSales)}</td>
                    <td className="px-5 py-3">
                      <Badge variant={s.isActive ? 'success' : 'neutral'} dot>
                        {s.isActive ? 'Active' : 'Closed'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
