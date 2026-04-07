import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { IndianRupee, ShoppingBag, UtensilsCrossed, Zap, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatTime } from '../../lib/formatters';
import api from '../../lib/api';
import type { DashboardData } from '../../types';
import { useBranchStore } from '../../store/useBranchStore';
import React from 'react';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const selectedBranchId = useBranchStore(s => s.selectedBranchId);

  useEffect(() => {
    if (!selectedBranchId) return;
    setLoading(true);
    api.get(`/reports/dashboard?branchId=${selectedBranchId}`).then(({ data }) => {
      setData(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedBranchId]);

  if (!selectedBranchId) return null;
  if (loading) return <PageLoader />;
  if (!data) return <p className="text-ink-muted text-sm">Failed to load dashboard</p>;

  const statCards = [
    { icon: <IndianRupee className="w-5 h-5" />, label: "Today's Revenue", value: formatCurrency(data.todayRevenue), accentColor: '#FF2D78', shadowColor: '#FF2D78' },
    { icon: <ShoppingBag className="w-5 h-5" />, label: 'Total Orders', value: String(data.todayOrders), accentColor: '#00FFB3', shadowColor: '#00FFB3' },
    { icon: <UtensilsCrossed className="w-5 h-5" />, label: 'Active Tables', value: String(data.activeTables), accentColor: '#FFE600', shadowColor: '#FFE600' },
    { icon: <Zap className="w-5 h-5" />, label: 'Session', value: data.activeSession ? 'ACTIVE' : 'CLOSED', accentColor: data.activeSession ? '#00FFB3' : '#505050', shadowColor: data.activeSession ? '#00FFB3' : '#2A2A2A' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-neon-pink mb-1">Admin Console</p>
          <h1 className="text-3xl font-black tracking-[-0.03em] text-white uppercase">Dashboard</h1>
          <p className="text-xs text-ink-muted mt-1 font-medium">Today's performance overview</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-2 border border-edge rounded">
          <TrendingUp className="w-3.5 h-3.5 text-neon-mint" />
          <span className="text-[10px] font-black uppercase tracking-[0.1em] text-ink-secondary">Live Data</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-surface-2 border border-edge rounded p-5 transition-all duration-100 hover:translate-x-[-1px] hover:translate-y-[-1px] cursor-default"
            style={{ boxShadow: `4px 4px 0px ${s.shadowColor}` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-9 h-9 rounded flex items-center justify-center"
                style={{ backgroundColor: `${s.accentColor}18`, border: `1px solid ${s.accentColor}30`, color: s.accentColor }}
              >
                {s.icon}
              </div>
            </div>
            <p className="text-2xl font-black tracking-[-0.02em] text-white mb-0.5" style={{ color: s.accentColor }}>
              {s.value}
            </p>
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-ink-muted">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-surface-2 border border-edge rounded p-6 mb-6"
           style={{ boxShadow: '4px 4px 0px #FF2D78' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-black tracking-[0.06em] uppercase text-white">Revenue — Last 7 Days</h2>
          <span className="text-[10px] font-black uppercase tracking-[0.1em] text-neon-pink px-2 py-1 bg-[rgba(255,45,120,0.1)] border border-[rgba(255,45,120,0.2)] rounded">
            ₹ Revenue
          </span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data.revenueChart}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF2D78" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#FF2D78" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="#1A1A1A" />
            <XAxis
              dataKey="date"
              stroke="#505050"
              fontSize={10}
              fontWeight={700}
              tickFormatter={(v) => new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              tick={{ fill: '#505050', fontFamily: 'Space Grotesk', fontSize: 10 }}
            />
            <YAxis
              stroke="#505050"
              fontSize={10}
              fontWeight={700}
              tickFormatter={(v) => `₹${v}`}
              tick={{ fill: '#505050', fontFamily: 'Space Grotesk', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '4px', fontSize: '12px', fontFamily: 'Space Grotesk', color: '#FFFFFF' }}
              formatter={(v: number) => [formatCurrency(v), 'Revenue']}
              labelFormatter={(l) => new Date(l).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' })}
            />
            <Area type="monotone" dataKey="revenue" stroke="#FF2D78" fill="url(#revenueGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Orders */}
        <div className="bg-surface-2 border border-edge rounded overflow-hidden"
             style={{ boxShadow: '4px 4px 0px #00FFB3' }}>
          <div className="px-5 py-4 border-b border-edge">
            <h2 className="text-xs font-black tracking-[0.08em] uppercase text-white">Recent Orders</h2>
          </div>
          <div className="divide-y divide-edge">
            {data.recentOrders.slice(0, 8).map((order) => (
              <div key={order.id} className="flex items-center justify-between px-5 py-3 hover:bg-[rgba(255,45,120,0.04)] transition-colors">
                <div>
                  <p className="text-xs font-bold font-mono text-ink-primary">{order.orderNumber}</p>
                  <p className="text-[10px] text-ink-muted mt-0.5">
                    Table {order.table?.number} · {formatTime(order.createdAt)}
                  </p>
                </div>
                <Badge
                  variant={order.status === 'PAID' ? 'success' : order.status === 'CANCELLED' ? 'danger' : 'warning'}
                  dot
                >
                  {order.status}
                </Badge>
              </div>
            ))}
            {data.recentOrders.length === 0 && (
              <p className="text-ink-muted text-xs text-center py-10 font-medium">No orders yet today</p>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-surface-2 border border-edge rounded overflow-hidden"
             style={{ boxShadow: '4px 4px 0px #FFE600' }}>
          <div className="px-5 py-4 border-b border-edge">
            <h2 className="text-xs font-black tracking-[0.08em] uppercase text-white">Top Products</h2>
          </div>
          <div className="p-5 space-y-3">
            {data.topProducts.map((product, i) => (
              <div key={product.name} className="flex items-center gap-3">
                <span
                  className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black"
                  style={{ backgroundColor: '#FF2D78', color: '#FFFFFF', boxShadow: '2px 2px 0px rgba(255,45,120,0.3)' }}
                >
                  {i + 1}
                </span>
                <span className="flex-1 text-xs font-semibold text-ink-primary">{product.name}</span>
                <span className="text-xs font-black text-neon-mint">{product._sum.quantity}×</span>
              </div>
            ))}
            {data.topProducts.length === 0 && (
              <p className="text-ink-muted text-xs text-center py-8 font-medium">No sales yet today</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
