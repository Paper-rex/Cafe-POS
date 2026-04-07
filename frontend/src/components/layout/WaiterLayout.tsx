import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Map, ClipboardList, LogOut, Zap } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import BranchSelector from '../shared/BranchSelector';
import { useSSE } from '../../hooks/useSSE';
import { useToastStore } from '../../store/useToastStore';

export default function WaiterLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);

  useSSE({
    onOrderReadyToServe: (payload) => {
      const message = payload?.message || `Order #${payload?.orderNumber || ''} is Ready to Serve`;
      addToast('info', message);
    },
    onPaymentConfirmed: (payload) => {
      if (payload?.source === 'ONLINE_SELF_ORDER') {
        addToast('success', payload?.message || `Online Payment Received for Order #${payload?.orderNumber || ''}`);
      }
    },
  });

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wide rounded transition-all ${
      isActive
        ? 'bg-[rgba(255,45,120,0.12)] text-neon-pink border border-[rgba(255,45,120,0.25)]'
        : 'text-ink-muted hover:text-ink-secondary hover:bg-surface-2 border border-transparent'
    }`;

  return (
    <div className="min-h-screen dot-grid" style={{ backgroundColor: '#0A0A0A' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-edge px-6 py-3 flex items-center justify-between"
              style={{ backgroundColor: '#0D0D0D' }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-neon-pink rounded flex items-center justify-center"
               style={{ boxShadow: '2px 2px 0px rgba(255,45,120,0.4)' }}>
            <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-sm font-black tracking-[-0.02em] text-white">INDUS POS</span>
            <span className="ml-2 text-[9px] font-black tracking-[0.15em] uppercase text-neon-mint">Waiter</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1.5">
          <NavLink to="/waiter" end className={navLinkClass}>
            <Map className="w-3.5 h-3.5" />
            Floor View
          </NavLink>
          <NavLink to="/waiter/orders" className={navLinkClass}>
            <ClipboardList className="w-3.5 h-3.5" />
            My Orders
          </NavLink>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-4">
          <BranchSelector />
          <span className="text-xs font-semibold text-ink-secondary hidden sm:block">
            {user?.name || user?.email}
          </span>
          <button
            onClick={async () => { await logout(); navigate('/login'); }}
            className="p-2 rounded border border-edge text-ink-muted hover:text-danger hover:border-danger transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="p-6"
      >
        <Outlet />
      </motion.main>
    </div>
  );
}
