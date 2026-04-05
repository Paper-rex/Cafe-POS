import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Coffee, Clock, History, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import BranchSelector from '../shared/BranchSelector';
import { useSSE } from '../../hooks/useSSE';
import { useToastStore } from '../../store/useToastStore';

export default function CashierLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);

  useSSE({
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
          <NavLink to="/cashier" end className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-brand-main text-white' : 'text-text-secondary hover:bg-surface-2'}`}>
            <Clock className="w-4 h-4" /> Pending
          </NavLink>
          <NavLink to="/cashier/history" className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-brand-main text-white' : 'text-text-secondary hover:bg-surface-2'}`}>
            <History className="w-4 h-4" /> History
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
