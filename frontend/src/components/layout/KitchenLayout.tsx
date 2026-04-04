import { Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Coffee, ChefHat, LogOut, Clock } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useState, useEffect } from 'react';

export default function KitchenLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(i); }, []);

  return (
    <div className="min-h-screen flex bg-surface-1">
      <aside className="w-16 bg-brand-dark flex flex-col items-center py-6 shrink-0">
        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-8"><Coffee className="w-5 h-5 text-white" /></div>
        <div className="flex-1 flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-white"><ChefHat className="w-5 h-5" /></div>
        </div>
        <div className="space-y-3 flex flex-col items-center">
          <div className="text-white/60 text-[10px] text-center font-mono">{time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">{(user?.name || 'K')[0]}</div>
          <button onClick={async () => { await logout(); navigate('/login'); }} className="text-white/40 hover:text-white"><LogOut className="w-4 h-4" /></button>
        </div>
      </aside>
      <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 p-6 overflow-auto"><Outlet /></motion.main>
    </div>
  );
}
