import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Coffee, Map, ClipboardList, LogOut } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-surface-1">
      <header className="bg-white border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-main rounded-lg flex items-center justify-center"><Coffee className="w-4 h-4 text-white" /></div>
          <span className="font-display text-lg font-bold text-brand-dark">Café POS</span>
        </div>
        <nav className="flex items-center gap-1">
          <NavLink to="/waiter" end className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-brand-main text-white' : 'text-text-secondary hover:bg-surface-2'}`}>
            <Map className="w-4 h-4" /> Floor View
          </NavLink>
          <NavLink to="/waiter/orders" className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-brand-main text-white' : 'text-text-secondary hover:bg-surface-2'}`}>
            <ClipboardList className="w-4 h-4" /> My Orders
          </NavLink>
        </nav>
        <div className="flex items-center gap-4">
          <BranchSelector />
          <span className="text-sm text-text-secondary">{user?.name || user?.email}</span>
          <button onClick={async () => { await logout(); navigate('/login'); }} className="p-2 rounded-lg hover:bg-surface-2 text-text-muted"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>
      <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6"><Outlet /></motion.main>
    </div>
  );
}
