import { useEffect, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { formatCurrency, formatDateTime } from '../../lib/formatters';
import { LayoutGrid, List, History as HistoryIcon } from 'lucide-react';
import api from '../../lib/api';

const methodColor: Record<string, string> = { CASH: '#00FFB3', CARD: '#38BDF8', UPI: '#FF2D78' };
const methodBadge: Record<string, 'success' | 'info' | 'pink'> = { CASH: 'success', CARD: 'info', UPI: 'pink' };

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
        <div className="flex items-center gap-3">
          <HistoryIcon className="w-5 h-5 text-neon-pink" />
          <h1 className="text-2xl font-black tracking-[-0.02em] text-white uppercase">Payment History</h1>
          <span className="text-[10px] font-black uppercase tracking-[0.1em] px-2 py-1 bg-surface-2 border border-edge rounded text-ink-muted">
            {payments.length} records
          </span>
        </div>
        {/* View toggle */}
        <div className="flex p-1 bg-surface-2 border border-edge rounded gap-1">
          {([['table', List], ['card', LayoutGrid]] as const).map(([mode, Icon]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide rounded transition-all ${
                viewMode === mode ? 'bg-neon-pink text-white' : 'text-ink-muted hover:text-ink-secondary'
              }`}
              style={viewMode === mode ? { boxShadow: '2px 2px 0px rgba(255,45,120,0.4)' } : {}}
            >
              <Icon className="w-3.5 h-3.5" />
              {mode}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-surface-2 border border-edge rounded overflow-hidden" style={{ boxShadow: '4px 4px 0px #FF2D78' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-1 border-b border-edge">
                  {['Order', 'Table', 'Method', 'Amount', 'Confirmed By', 'Time'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-black tracking-[0.12em] uppercase text-ink-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-[rgba(255,45,120,0.04)] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-pink" />
                        <span className="font-mono text-xs font-bold text-ink-primary">{p.order?.orderNumber || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-black px-2 py-1 bg-surface-3 border border-edge rounded text-ink-secondary">
                        T{p.order?.table?.number}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={methodBadge[p.method] || 'neutral'}>{p.method}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-black" style={{ color: methodColor[p.method] || '#A0A0A0' }}>
                        {formatCurrency(p.amount)}
                      </span>
                      {p.method === 'CASH' && p.amountTendered && (
                        <div className="text-[10px] text-ink-muted mt-0.5">
                          ↑ {formatCurrency(p.amountTendered)} / ←{formatCurrency(p.change || 0)}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-ink-secondary">{p.confirmedBy?.name || '—'}</td>
                    <td className="px-5 py-3 text-xs text-ink-muted">{formatDateTime(p.createdAt)}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center text-xs text-ink-muted font-medium">
                      No payment history records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {payments.map((p: any) => {
            const color = methodColor[p.method] || '#A0A0A0';
            return (
              <div
                key={p.id}
                className="bg-surface-2 border border-edge rounded p-5 transition-all duration-100 hover:translate-x-[-1px] hover:translate-y-[-1px]"
                style={{ boxShadow: `4px 4px 0px ${color}`, borderTop: `2px solid ${color}` }}
              >
                <div className="flex items-start justify-between mb-4 pb-4 border-b border-edge">
                  <div>
                    <p className="text-[10px] font-black tracking-[0.12em] uppercase text-ink-muted mb-1">Order Number</p>
                    <span className="font-mono text-base font-black" style={{ color }}>
                      {p.order?.orderNumber || '—'}
                    </span>
                  </div>
                  <Badge variant={methodBadge[p.method] || 'neutral'}>{p.method}</Badge>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-black tracking-[0.1em] uppercase text-ink-muted mb-1">Amount Paid</p>
                    <span className="text-xl font-black" style={{ color }}>
                      {formatCurrency(p.amount)}
                    </span>
                    {p.method === 'CASH' && p.amountTendered && (
                      <div className="text-[10px] text-ink-muted mt-1 space-y-0.5">
                        <div>Tendered: <span className="text-ink-secondary font-bold">{formatCurrency(p.amountTendered)}</span></div>
                        <div>Change: <span className="text-neon-mint font-bold">{formatCurrency(p.change || 0)}</span></div>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black tracking-[0.1em] uppercase text-ink-muted mb-1">Table</p>
                    <span className="font-black text-base text-ink-primary">T{p.order?.table?.number}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-edge">
                  <div>
                    <p className="text-[9px] font-black tracking-[0.1em] uppercase text-ink-muted">Confirmed By</p>
                    <p className="text-xs font-semibold text-ink-secondary">{p.confirmedBy?.name || 'System'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black tracking-[0.1em] uppercase text-ink-muted">Date</p>
                    <p className="text-[10px] text-ink-muted">{formatDateTime(p.createdAt)}</p>
                  </div>
                </div>
              </div>
            );
          })}
          {payments.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <LayoutGrid className="w-10 h-10 text-ink-muted mx-auto mb-3" />
              <p className="text-xs text-ink-muted font-medium">No payment history yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
