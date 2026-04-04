import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Package, Map, CreditCard,
  Clock, BarChart3, LogOut, Coffee, ChevronRight,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import api from '../../lib/api';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/staff', icon: Users, label: 'Staff' },
  { to: '/admin/products', icon: Package, label: 'Products' },
  { to: '/admin/floors', icon: Map, label: 'Floors & Tables' },
  { to: '/admin/payment-config', icon: CreditCard, label: 'Payment Methods' },
  { to: '/admin/session', icon: Clock, label: 'Session' },
  { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
];

export default function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const [activeSession, setActiveSession] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await api.get('/pos-session/active');
        setActiveSession(!!data);
      } catch {
        setActiveSession(false);
      }
    };
    checkSession();
    const interval = setInterval(checkSession, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex bg-surface-1">
      {/* Sidebar */}
      <aside className="w-60 bg-brand-mid flex flex-col shrink-0 sticky top-0 h-screen">
        {/* Logo */}
        <div className="px-5 py-6 flex items-center gap-3">
          <div className="w-9 h-9 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center">
            <Coffee className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-xl font-extrabold text-white tracking-tight">Café POS</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-white/15 text-white border-l-3 border-accent'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.label === 'Session' && activeSession && (
                <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Session Active" />
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center text-accent text-sm font-bold">
              {(user?.name || user?.email || 'A')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || user?.email}</p>
              <p className="text-xs text-white/50">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 mt-1 w-full rounded-xl text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-8"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
