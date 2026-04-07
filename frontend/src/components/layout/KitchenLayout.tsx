import { Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChefHat, LogOut, Zap } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useState, useEffect } from 'react';
import BranchSelector from '../shared/BranchSelector';
import { useSSE } from '../../hooks/useSSE';
import { useToastStore } from '../../store/useToastStore';

export default function KitchenLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  useSSE({
    onPaymentConfirmed: (payload) => {
      if (payload?.source === 'ONLINE_SELF_ORDER') {
        addToast('success', payload?.message || `Online Payment Received for Order #${payload?.orderNumber || ''}`);
      }
    },
    onOrderReadyToServe: (payload) => {
      addToast('info', payload?.message || `Waiter notified: Order #${payload?.orderNumber || ''} is ready to serve`);
    },
  });

  const userInitial = (user?.name || 'K')[0].toUpperCase();
  const timeStr = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="min-h-screen flex dot-grid" style={{ backgroundColor: '#0A0A0A' }}>
      {/* Icon sidebar */}
      <aside className="w-14 flex flex-col items-center py-5 shrink-0 border-r border-edge" style={{ backgroundColor: '#0D0D0D' }}>
        {/* Logo icon */}
        <div className="w-8 h-8 bg-neon-pink rounded flex items-center justify-center mb-8"
             style={{ boxShadow: '2px 2px 0px rgba(255,45,120,0.4)' }}>
          <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>

        <div className="flex-1 flex flex-col items-center gap-4">
          <div className="w-9 h-9 bg-surface-2 border border-[rgba(255,45,120,0.3)] rounded flex items-center justify-center text-neon-pink"
               title="Kitchen Queue">
            <ChefHat className="w-4 h-4" />
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col items-center gap-3">
          <div className="text-[9px] font-mono text-ink-muted text-center leading-tight">
            {timeStr.split(':')[0]}:{timeStr.split(':')[1]}
            <br />
            <span className="text-neon-pink">{timeStr.split(':')[2]}</span>
          </div>
          <div className="w-7 h-7 bg-neon-pink rounded flex items-center justify-center text-white text-[10px] font-black">
            {userInitial}
          </div>
          <button
            onClick={async () => { await logout(); navigate('/login'); }}
            className="text-ink-muted hover:text-danger transition-colors"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header bar */}
        <header className="border-b border-edge px-6 py-3 flex items-center justify-between shrink-0"
                style={{ backgroundColor: '#0D0D0D' }}>
          <div>
            <span className="text-sm font-black tracking-[-0.02em] text-white">INDUS POS</span>
            <span className="ml-2 text-[9px] font-black tracking-[0.15em] uppercase text-neon-orange">Kitchen</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="status-dot active" />
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-neon-mint">Live Queue</span>
            </div>
            <BranchSelector />
          </div>
        </header>

        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 p-6 overflow-auto"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}
