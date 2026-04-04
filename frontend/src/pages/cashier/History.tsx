import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { formatCurrency, formatDateTime } from '../../lib/formatters';
import api from '../../lib/api';

export default function CashierHistory() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/payments/history').then(({ data }) => setData(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const payments = data?.payments || [];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-text-primary mb-6">Payment History</h1>
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-border">
            {['Order', 'Table', 'Method', 'Amount', 'Confirmed By', 'Time'].map(h => (
              <th key={h} className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-surface-2">
            {payments.map((p: any) => (
              <tr key={p.id} className="hover:bg-surface-1">
                <td className="px-6 py-3 text-sm font-mono">{p.order?.orderNumber || '—'}</td>
                <td className="px-6 py-3 text-sm">T{p.order?.table?.number}</td>
                <td className="px-6 py-3"><Badge variant={p.method === 'CASH' ? 'success' : p.method === 'CARD' ? 'info' : 'warning'}>{p.method}</Badge></td>
                <td className="px-6 py-3 text-sm font-medium">{formatCurrency(p.amount)}</td>
                <td className="px-6 py-3 text-sm text-text-secondary">{p.confirmedBy?.name || '—'}</td>
                <td className="px-6 py-3 text-sm text-text-muted">{formatDateTime(p.createdAt)}</td>
              </tr>
            ))}
            {payments.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-text-muted">No payment history</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
