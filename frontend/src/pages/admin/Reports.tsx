import { useEffect, useState, useMemo } from 'react';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { useToastStore } from '../../store/useToastStore';
import { FileText, Calendar, Filter, FileSpreadsheet } from 'lucide-react';
import api from '../../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useBranchStore } from '../../store/useBranchStore';

interface ReportData {
  month: number;
  year: number;
  totalRevenue: number;
  totalOrders: number;
  orders: any[];
  topProducts: any[];
}

export default function Reports() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const { availableBranches, selectedBranchId: globalBranchId } = useBranchStore();
  const [reportBranchId, setReportBranchId] = useState<string>('ALL');

  useEffect(() => {
    if (globalBranchId && reportBranchId === 'ALL' && availableBranches.length > 0) {
      setReportBranchId(globalBranchId);
    }
  }, [globalBranchId, availableBranches]);

  const addToast = useToastStore((s) => s.addToast);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const branchQuery = reportBranchId !== 'ALL' ? `&branchId=${reportBranchId}` : '';
      const res = await api.get(`/reports/monthly?month=${selectedMonth}&year=${selectedYear}${branchQuery}`);
      setData(res.data);
    } catch {
      addToast('error', 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [selectedMonth, selectedYear, reportBranchId]);

  const dailyRevenueData = useMemo(() => {
    if (!data) return [];
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const map = new Map<number, number>();
    data.orders.forEach(o => {
      const day = new Date(o.createdAt).getDate();
      const rev = o.payment?.amount || 0;
      map.set(day, (map.get(day) || 0) + rev);
    });
    return Array.from({ length: daysInMonth }, (_, i) => ({ date: i + 1, revenue: map.get(i + 1) || 0 }));
  }, [data, selectedYear, selectedMonth]);

  const topProductsChartData = useMemo(() => {
    if (!data) return [];
    return data.topProducts.map(p => ({ name: p.name, quantity: p._sum.quantity, revenue: p._sum.subtotal })).sort((a, b) => b.quantity - a.quantity);
  }, [data]);

  const exportCSV = () => {
    if (!data || !data.orders.length) return addToast('error', 'No data to export');
    const headers = ['Order ID,Date,Table,Status,Payment Method,Total\n'];
    const csvContent = data.orders.map(o => [o.id, new Date(o.createdAt).toLocaleString().replace(/,/g, ''), o.table?.number ? `T${o.table.number}` : 'Takeaway', o.status, o.payment?.method || 'N/A', (o.payment?.amount || 0).toFixed(2)].join(','));
    const blob = new Blob([headers + csvContent.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Report_${selectedYear}_${selectedMonth}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (!data || !data.orders.length) return addToast('error', 'No data to export');
    const doc = new jsPDF();
    doc.setFontSize(22); doc.text('Indus POS - Monthly Report', 14, 20);
    doc.setFontSize(11);
    doc.text(`Period: ${selectedMonth}/${selectedYear}`, 14, 30);
    doc.text(`Total Revenue: ₹${data.totalRevenue.toFixed(2)}`, 14, 36);
    doc.text(`Total Orders: ${data.totalOrders}`, 14, 42);
    const tableColumn = ['Order ID', 'Date', 'Table', 'Status', 'Total', 'Method'];
    const tableRows = data.orders.map(o => [o.id.slice(-6).toUpperCase(), new Date(o.createdAt).toLocaleDateString(), o.table?.number ? `T${o.table.number}` : 'Takeaway', o.status, `₹${(o.payment?.amount || 0).toFixed(2)}`, o.payment?.method || 'N/A']);
    autoTable(doc, { startY: 50, head: [tableColumn], body: tableRows, theme: 'grid', headStyles: { fillColor: [255, 45, 120] } });
    doc.save(`Report_${selectedYear}_${selectedMonth}.pdf`);
  };

  const selectClass = "bg-surface-2 border border-edge rounded text-xs font-bold text-ink-primary px-3 py-2 focus:border-neon-pink outline-none cursor-pointer";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-neon-pink mb-1">Admin Console</p>
          <h1 className="text-3xl font-black tracking-[-0.03em] text-white uppercase">Reports</h1>
          <p className="text-xs text-ink-muted mt-1 font-medium">Analytics and financial exports</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-surface-2 border border-edge rounded px-3 py-2">
            <Calendar className="w-3.5 h-3.5 text-neon-pink shrink-0" />
            <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="bg-transparent text-xs font-bold text-ink-primary focus:outline-none cursor-pointer">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'short' })}</option>
              ))}
            </select>
            <span className="text-edge">|</span>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-transparent text-xs font-bold text-ink-primary focus:outline-none cursor-pointer">
              {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-surface-2 border border-edge rounded px-3 py-2">
            <Filter className="w-3.5 h-3.5 text-neon-yellow shrink-0" />
            <select value={reportBranchId} onChange={e => setReportBranchId(e.target.value)} className="bg-transparent text-xs font-bold text-ink-primary focus:outline-none cursor-pointer">
              <option value="ALL">All Branches</option>
              {availableBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <Button variant="outline" onClick={exportCSV} icon={<FileSpreadsheet className="w-3.5 h-3.5" />} size="sm">CSV</Button>
          <Button onClick={exportPDF} icon={<FileText className="w-3.5 h-3.5" />} size="sm">PDF</Button>
        </div>
      </div>

      {loading ? <PageLoader /> : data ? (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Revenue', value: `₹${data.totalRevenue.toFixed(2)}`, color: '#FF2D78' },
              { label: 'Total Orders', value: String(data.totalOrders), color: '#00FFB3' },
              { label: 'Avg Order Value', value: `₹${data.totalOrders > 0 ? (data.totalRevenue / data.totalOrders).toFixed(2) : '0.00'}`, color: '#FFE600' },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface-2 border border-edge rounded p-5" style={{ boxShadow: `4px 4px 0px ${stat.color}` }}>
                <p className="text-[10px] font-black tracking-[0.12em] uppercase text-ink-muted mb-2">{stat.label}</p>
                <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Daily Revenue Bar Chart */}
          <div className="bg-surface-2 border border-edge rounded p-6" style={{ boxShadow: '4px 4px 0px #FF2D78' }}>
            <h3 className="text-xs font-black tracking-[0.08em] uppercase text-white mb-5">Daily Revenue</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyRevenueData}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#1A1A1A" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#505050', fontSize: 10, fontFamily: 'Space Grotesk', fontWeight: 700 }} dy={6} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#505050', fontSize: 10, fontFamily: 'Space Grotesk', fontWeight: 700 }} tickFormatter={(v) => `₹${v}`} dx={-4} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,45,120,0.06)' }}
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '4px', fontSize: '12px', fontFamily: 'Space Grotesk', color: '#FFFFFF' }}
                    formatter={(v: number) => [`₹${v.toFixed(2)}`, 'Revenue']}
                    labelFormatter={(label) => `Day ${label}/${selectedMonth}`}
                  />
                  <Bar dataKey="revenue" fill="#FF2D78" radius={[2, 2, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top Products */}
            <div className="bg-surface-2 border border-edge rounded p-5" style={{ boxShadow: '4px 4px 0px #FFE600' }}>
              <h3 className="text-xs font-black tracking-[0.08em] uppercase text-white mb-5">Top Products</h3>
              <div className="space-y-3">
                {topProductsChartData.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black text-white" style={{ backgroundColor: '#FF2D78' }}>{i + 1}</span>
                    <span className="flex-1 text-xs font-semibold text-ink-primary truncate">{p.name}</span>
                    <div className="text-right">
                      <div className="text-xs font-black text-neon-yellow">{p.quantity}×</div>
                      <div className="text-[10px] text-ink-muted">₹{p.revenue?.toFixed(2) || '0.00'}</div>
                    </div>
                  </div>
                ))}
                {topProductsChartData.length === 0 && <p className="text-ink-muted text-xs text-center py-4">No products sold this period.</p>}
              </div>
            </div>

            {/* Order History Table */}
            <div className="bg-surface-2 border border-edge rounded overflow-hidden" style={{ boxShadow: '4px 4px 0px #00FFB3' }}>
              <div className="px-5 py-4 border-b border-edge">
                <h3 className="text-xs font-black tracking-[0.08em] uppercase text-white">Order History</h3>
              </div>
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full min-w-[500px]">
                  <thead className="sticky top-0">
                    <tr className="bg-surface-1 border-b border-edge">
                      {['Order', 'Date', 'Table', 'Status', 'Total'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black tracking-[0.1em] uppercase text-ink-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge">
                    {data.orders.map((order) => (
                      <tr key={order.id} className="hover:bg-[rgba(255,45,120,0.04)] transition-colors">
                        <td className="px-4 py-2.5 text-[11px] font-mono font-bold text-ink-primary">#{order.id.slice(-6).toUpperCase()}</td>
                        <td className="px-4 py-2.5 text-[10px] text-ink-muted">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-2.5 text-[11px] text-ink-secondary">{order.table?.number ? `T${order.table.number}` : 'Take'}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant={order.status === 'PAID' ? 'success' : order.status === 'CANCELLED' ? 'danger' : 'warning'} dot>
                            {order.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-[11px] font-black text-neon-mint">₹{(order.payment?.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    {data.orders.length === 0 && (
                      <tr><td colSpan={5} className="py-10 text-center text-xs text-ink-muted">No orders found for this period.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="py-20 text-center text-xs text-ink-muted font-medium">No report data available</div>
      )}
    </div>
  );
}
