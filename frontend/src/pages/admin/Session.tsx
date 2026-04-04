import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { useToastStore } from '../../store/useToastStore';
import { Play, Square, Clock } from 'lucide-react';
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
      <h1 className="font-display text-3xl font-bold text-text-primary mb-2">Session</h1>
      <p className="text-text-secondary mb-8">Manage POS sessions</p>

      {activeSession ? (
        <Card className="p-6 mb-8 border-2 border-brand-light bg-success-pale/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-main rounded-2xl flex items-center justify-center"><Play className="w-6 h-6 text-white" /></div>
              <div>
                <div className="flex items-center gap-2"><h2 className="font-display text-xl font-bold text-text-primary">Session Active</h2><Badge variant="success" dot>Live</Badge></div>
                <p className="text-sm text-text-secondary">Opened {formatDateTime(activeSession.openedAt)} by {activeSession.openedBy?.name || activeSession.openedBy?.email}</p>
              </div>
            </div>
            <Button variant="danger" icon={<Square className="w-4 h-4" />} loading={actionLoading} onClick={handleClose}>Close Session</Button>
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center mb-8">
          <Clock className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold text-text-primary mb-2">No Active Session</h2>
          <p className="text-text-secondary mb-6">Open a session to start taking orders</p>
          <Button size="lg" icon={<Play className="w-5 h-5" />} loading={actionLoading} onClick={handleOpen}>Open Session</Button>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-border"><h2 className="font-display text-lg font-semibold text-text-primary">Session History</h2></div>
          <table className="w-full">
            <thead><tr className="border-b border-border">
              {['Opened', 'Closed', 'Opened By', 'Orders', 'Total Sales', 'Status'].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-surface-2">
              {history.map(s => (
                <tr key={s.id} className="hover:bg-surface-1">
                  <td className="px-6 py-3 text-sm">{formatDateTime(s.openedAt)}</td>
                  <td className="px-6 py-3 text-sm">{s.closedAt ? formatDateTime(s.closedAt) : '—'}</td>
                  <td className="px-6 py-3 text-sm">{s.openedBy?.name || s.openedBy?.email}</td>
                  <td className="px-6 py-3 text-sm">{s._count?.orders || 0}</td>
                  <td className="px-6 py-3 text-sm font-medium">{formatCurrency(s.totalSales)}</td>
                  <td className="px-6 py-3"><Badge variant={s.isActive ? 'success' : 'neutral'} dot>{s.isActive ? 'Active' : 'Closed'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
