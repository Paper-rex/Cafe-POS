import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';

import { Badge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { formatCurrency, formatDateTime } from '../../lib/formatters';
import { LayoutGrid, List } from 'lucide-react';
import api from '../../lib/api';

export default function CashierHistory() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  useEffect(() => {
    api.get('/payments/history').then(({ data }) => setData(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const payments = data?.payments || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-text-primary">Payment History</h1>
        <div className="flex bg-surface-2/50 p-1 rounded-lg border border-surface-2 backdrop-blur-sm">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'table'
                ? 'bg-surface-0 text-brand-main shadow-sm ring-1 ring-border/50'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-1'
              }`}
          >
            <List size={16} />
            Table
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === 'card'
                ? 'bg-surface-0 text-brand-main shadow-sm ring-1 ring-border/50'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-1'
              }`}
          >
            <LayoutGrid size={16} />
            Cards
          </button>
        </div>
      </div>


      {viewMode === 'table' ? (
        <Card className="overflow-hidden border border-surface-2 shadow-sm rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-1/50 border-b border-surface-2 text-xs uppercase tracking-wider text-text-muted font-semibold">
                  {['Order', 'Table', 'Method', 'Amount', 'Confirmed By', 'Time'].map(h => (
                    <th key={h} className="px-6 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-2 bg-surface-0">
                {payments.map((p: any) => (
                  <tr key={p.id} className="transition-colors duration-200 hover:bg-surface-50 group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-main/40 group-hover:bg-brand-main group-hover:scale-110 transition-all duration-300"></div>
                        <span className="font-mono text-sm font-medium text-text-primary">{p.order?.orderNumber || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2.5 py-1 rounded-md bg-surface-2 text-text-primary font-medium text-xs shadow-none border border-surface-2/50 group-hover:border-surface-3 transition-colors">
                        T{p.order?.table?.number}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={p.method === 'CASH' ? 'success' : p.method === 'CARD' ? 'info' : 'warning'} className="shadow-sm">
                        {p.method}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-display font-semibold text-text-primary group-hover:text-brand-main transition-colors duration-200">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary font-medium">
                      {p.confirmedBy?.name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                      {formatDateTime(p.createdAt)}
                    </td>
                  </tr>
                ))}

                {payments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-text-muted">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <List className="h-8 w-8 text-surface-3 mb-2" />
                        <p>No payment history records found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {payments.map((p: any) => (
            <Card
              key={p.id}
              className="p-6 flex flex-col gap-5 border border-surface-2 shadow-sm rounded-2xl transition-all duration-300 hover:shadow-lg hover:border-brand-main/30 hover:-translate-y-1 bg-gradient-to-br from-surface-0 to-surface-50 group"
            >
              <div className="flex items-start justify-between border-b border-surface-2/60 border-dashed pb-4">
                <div>
                  <p className="text-[11px] text-text-muted font-medium tracking-wide uppercase mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-surface-3 group-hover:bg-brand-main/50 transition-colors"></span>
                    Order Number
                  </p>
                  <span className="font-mono text-xl font-bold text-text-primary group-hover:text-brand-main transition-colors">
                    {p.order?.orderNumber || '—'}
                  </span>
                </div>
                <Badge variant={p.method === 'CASH' ? 'success' : p.method === 'CARD' ? 'info' : 'warning'} className="shadow-sm mt-1">
                  {p.method}
                </Badge>
              </div>

              <div className="flex items-center justify-between py-1">
                <div className="flex flex-col">
                  <span className="text-[11px] text-text-secondary font-medium uppercase tracking-wide mb-0.5">Amount Paid</span>
                  <span className="font-display font-bold text-2xl text-brand-main">{formatCurrency(p.amount)}</span>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[11px] text-text-secondary font-medium uppercase tracking-wide mb-1">Table</span>
                  <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2.5 py-1 rounded-md bg-surface-2 text-text-primary font-bold text-base border border-surface-2/50 group-hover:border-surface-3 transition-colors">
                    T{p.order?.table?.number}
                  </span>
                </div>
              </div>

              <div className="mt-auto flex justify-between items-end pt-4 border-t border-surface-2/60 border-dashed">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Confirmed By</span>
                  <span className="font-medium text-sm text-text-primary capitalize">{p.confirmedBy?.name || 'System'}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Date & Time</span>
                  <span className="text-xs font-medium text-text-secondary">{formatDateTime(p.createdAt)}</span>
                </div>
              </div>
            </Card>
          ))}
          {payments.length === 0 && (
            <div className="col-span-full py-16 text-center text-text-muted flex flex-col items-center justify-center gap-3">
              <LayoutGrid className="h-10 w-10 text-surface-3" />
              <p className="text-lg font-medium text-text-primary">No Payment History</p>
              <p className="text-sm">Payments made will appear here as cards.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
