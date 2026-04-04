import { useEffect, useState, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { useToastStore } from '../../store/useToastStore';
import { Download, FileText, Calendar, Filter, FileSpreadsheet } from 'lucide-react';
import api from '../../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  const addToast = useToastStore((s) => s.addToast);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/monthly?month=${selectedMonth}&year=${selectedYear}`);
      setData(res.data);
    } catch {
      addToast('error', 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedMonth, selectedYear]);

  // Derived Data for Charts
  const dailyRevenueData = useMemo(() => {
    if (!data) return [];
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const map = new Map<number, number>();
    
    data.orders.forEach(o => {
      const day = new Date(o.createdAt).getDate();
      const rev = o.payment?.amount || 0;
      map.set(day, (map.get(day) || 0) + rev);
    });

    return Array.from({ length: daysInMonth }, (_, i) => ({
      date: i + 1,
      revenue: map.get(i + 1) || 0,
    }));
  }, [data, selectedYear, selectedMonth]);

  const topProductsChartData = useMemo(() => {
    if (!data) return [];
    return data.topProducts.map(p => ({
      name: p.name,
      quantity: p._sum.quantity,
      revenue: p._sum.subtotal
    })).sort((a, b) => b.quantity - a.quantity);
  }, [data]);

  // Exporters
  const exportCSV = () => {
    if (!data || !data.orders.length) return addToast('error', 'No data to export');
    
    const headers = ['Order ID,Date,Table,Status,Payment Method,Total\n'];
    const csvContent = data.orders.map(o => {
      const row = [
        o.id,
        new Date(o.createdAt).toLocaleString().replace(/,/g, ''),
        o.table?.number ? `T${o.table.number}` : 'Takeaway',
        o.status,
        o.payment?.method || 'N/A',
        (o.payment?.amount || 0).toFixed(2)
      ];
      return row.join(',');
    });

    const blob = new Blob([headers + csvContent.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report_${selectedYear}_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (!data || !data.orders.length) return addToast('error', 'No data to export');
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.text('Cafe POS - Monthly Report', 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Period: ${selectedMonth}/${selectedYear}`, 14, 30);
    doc.text(`Total Revenue: $${data.totalRevenue.toFixed(2)}`, 14, 36);
    doc.text(`Total Orders: ${data.totalOrders}`, 14, 42);

    const tableColumn = ["Order ID", "Date", "Table", "Status", "Total", "Method"];
    const tableRows = data.orders.map(o => [
      o.id.slice(-6).toUpperCase(),
      new Date(o.createdAt).toLocaleDateString(),
      o.table?.number ? `T${o.table.number}` : 'Takeaway',
      o.status,
      `$${(o.payment?.amount || 0).toFixed(2)}`,
      o.payment?.method || 'N/A'
    ]);

    autoTable(doc, {
      startY: 50,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [50, 213, 131] } // Brand main color
    });

    doc.save(`Report_${selectedYear}_${selectedMonth}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">Reports</h1>
          <p className="text-text-secondary mt-1">Analytics and financial exports</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-border p-1.5 rounded-xl text-text-primary">
            <Calendar className="w-4 h-4 text-text-muted ml-2 shrink-0" />
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-sm font-medium pr-2 focus:outline-none cursor-pointer text-text-primary"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'short' })}</option>
              ))}
            </select>
            <span className="text-border">|</span>
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-sm font-medium pr-2 focus:outline-none cursor-pointer text-text-primary"
            >
              {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          
          <Button variant="outline" onClick={exportCSV} icon={<FileSpreadsheet className="w-4 h-4" />}>
            CSV
          </Button>
          <Button onClick={exportPDF} icon={<FileText className="w-4 h-4" />}>
            PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <p className="text-sm font-medium text-text-secondary mb-1">Total Revenue</p>
              <h3 className="text-3xl font-display font-bold text-brand-main">
                <span className="text-2xl text-text-muted mr-1">$</span>
                {data.totalRevenue.toFixed(2)}
              </h3>
            </Card>
            <Card className="p-6">
              <p className="text-sm font-medium text-text-secondary mb-1">Total Orders</p>
              <h3 className="text-3xl font-display font-bold text-text-primary">
                {data.totalOrders}
              </h3>
            </Card>
            <Card className="p-6">
              <p className="text-sm font-medium text-text-secondary mb-1">Avg Order Value</p>
              <h3 className="text-3xl font-display font-bold text-text-primary">
                <span className="text-2xl text-text-muted mr-1">$</span>
                {data.totalOrders > 0 ? (data.totalRevenue / data.totalOrders).toFixed(2) : '0.00'}
              </h3>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Revenue Chart */}
            <Card className="p-6 col-span-1 lg:col-span-2">
              <h3 className="text-lg font-bold text-text-primary mb-6">Daily Revenue</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6B7280', fontSize: 12 }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6B7280', fontSize: 12 }} 
                      tickFormatter={(value) => `$${value}`}
                      dx={-10}
                    />
                    <Tooltip 
                      cursor={{ fill: '#F3F4F6' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                      labelFormatter={(label) => `Date: ${selectedMonth}/${label}/${selectedYear}`}
                    />
                    <Bar dataKey="revenue" fill="#32D583" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Top Products */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-text-primary mb-4">Top Products (Qty)</h3>
              <div className="space-y-4">
                {topProductsChartData.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-brand-pale text-brand-main flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </div>
                      <span className="font-medium text-text-primary">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-text-primary">{p.quantity}x</div>
                      <div className="text-xs text-text-muted">${p.revenue.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
                {topProductsChartData.length === 0 && (
                  <p className="text-text-muted text-center py-4">No products sold in this period.</p>
                )}
              </div>
            </Card>

            {/* Recent Orders Overview */}
            <Card className="p-0 overflow-hidden col-span-1 lg:col-span-2 text-text-primary">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-lg font-bold text-text-primary">Order History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-surface-2/50 text-text-secondary text-sm border-b border-border">
                      <th className="font-medium py-3 px-6">Order ID</th>
                      <th className="font-medium py-3 px-6">Date</th>
                      <th className="font-medium py-3 px-6">Table</th>
                      <th className="font-medium py-3 px-6">Status</th>
                      <th className="font-medium py-3 px-6">Payment</th>
                      <th className="font-medium py-3 px-6 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map((order) => (
                      <tr key={order.id} className="border-b border-border/50 hover:bg-surface-1 transition-colors">
                        <td className="py-4 px-6 text-sm font-medium text-text-primary">
                          #{order.id.slice(-6).toUpperCase()}
                        </td>
                        <td className="py-4 px-6 text-sm text-text-secondary">
                          {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        <td className="py-4 px-6 text-sm text-text-secondary">
                          {order.table?.number ? `T${order.table.number}` : 'Takeaway'}
                        </td>
                        <td className="py-4 px-6">
                          <Badge variant={order.status === 'PAID' ? 'success' : order.status === 'CANCELLED' ? 'danger' : 'warning'}>
                            {order.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 text-sm text-text-secondary">
                           {order.payment?.method ? (
                             <span className="capitalize">{order.payment.method.toLowerCase()}</span>
                           ) : '-'}
                        </td>
                        <td className="py-4 px-6 text-sm font-semibold text-text-primary text-right">
                          ${(order.payment?.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {data.orders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-text-muted">
                          No orders found for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      ) : (
        <div className="py-20 text-center text-text-muted">No data available</div>
      )}
    </div>
  );
}
