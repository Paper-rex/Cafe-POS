import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { DollarSign, ShoppingBag, UtensilsCrossed, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatTime, getStatusColor } from '../../lib/formatters';
import { useSSE } from '../../hooks/useSSE';
import api from '../../lib/api';
import type { DashboardData } from '../../types';

function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    tick();
  }, [target, duration]);
  return value;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = () => {
    api.get('/reports/dashboard').then(({ data }) => {
      setData(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useSSE({
    onOrderCreated: fetchDashboard,
    onOrderStatusUpdated: fetchDashboard,
    onPaymentConfirmed: fetchDashboard,
    onSessionOpened: fetchDashboard,
    onSessionClosed: fetchDashboard,
  });

  if (loading) return <PageLoader />;
  if (!data) return <p className="text-text-muted">Failed to load dashboard</p>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-1">Today's overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard icon={<DollarSign />} label="Today's Revenue" value={formatCurrency(data.todayRevenue)} color="brand" />
        <StatCard icon={<ShoppingBag />} label="Total Orders" value={String(data.todayOrders)} color="accent" />
        <StatCard icon={<UtensilsCrossed />} label="Active Tables" value={String(data.activeTables)} color="success" />
        <StatCard icon={<Zap />} label="Session" value={data.activeSession ? 'Active' : 'Closed'} color={data.activeSession ? 'success' : 'neutral'} />
      </div>

      {/* Revenue Chart */}
      <Card className="p-6 mb-8">
        <h2 className="font-display text-lg font-semibold text-text-primary mb-4">Revenue (Last 7 Days)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data.revenueChart}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#40916C" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#40916C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF4F0" />
            <XAxis dataKey="date" stroke="#8FA99A" fontSize={12} tickFormatter={(v) => new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} />
            <YAxis stroke="#8FA99A" fontSize={12} tickFormatter={(v) => `₹${v}`} />
            <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} labelFormatter={(l) => new Date(l).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' })} />
            <Area type="monotone" dataKey="revenue" stroke="#40916C" fill="url(#revenueGrad)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Recent Orders + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-text-primary mb-4">Recent Orders</h2>
          <div className="space-y-3">
            {data.recentOrders.slice(0, 8).map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-surface-2 last:border-0">
                <div>
                  <p className="text-sm font-mono font-medium text-text-primary">{order.orderNumber}</p>
                  <p className="text-xs text-text-muted">Table {order.table?.number} • {formatTime(order.createdAt)}</p>
                </div>
                <Badge variant={order.status === 'PAID' ? 'success' : order.status === 'CANCELLED' ? 'danger' : 'warning'}>
                  {order.status}
                </Badge>
              </div>
            ))}
            {data.recentOrders.length === 0 && <p className="text-text-muted text-sm text-center py-8">No orders yet today</p>}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-text-primary mb-4">Top Products</h2>
          <div className="space-y-3">
            {data.topProducts.map((product, i) => (
              <div key={product.name} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-pale text-brand-dark text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <span className="flex-1 text-sm text-text-primary">{product.name}</span>
                <span className="text-sm font-medium text-text-secondary">{product._sum.quantity}x</span>
              </div>
            ))}
            {data.topProducts.length === 0 && <p className="text-text-muted text-sm text-center py-8">No sales yet today</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const bgMap: Record<string, string> = { brand: 'bg-brand-pale', accent: 'bg-orange-50', success: 'bg-success-pale', neutral: 'bg-gray-100' };
  const iconMap: Record<string, string> = { brand: 'text-brand-main', accent: 'text-accent', success: 'text-brand-main', neutral: 'text-gray-500' };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl ${bgMap[color]} flex items-center justify-center ${iconMap[color]}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm text-text-secondary">{label}</p>
            <p className="text-2xl font-display font-bold text-text-primary">{value}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
