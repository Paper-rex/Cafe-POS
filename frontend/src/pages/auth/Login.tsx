import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Zap, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';

const stats = [
  { value: '2.4K+', label: 'Orders/Day' },
  { value: '₹8.5L', label: 'Revenue' },
  { value: '24', label: 'Staff' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAuthStore((s) => s.login);
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      addToast('success', `Welcome back, ${user?.name || user?.email}!`);
      const roleRoutes: Record<string, string> = {
        ADMIN: '/admin',
        WAITER: '/waiter',
        KITCHEN: '/kitchen',
        CASHIER: '/cashier',
      };
      navigate(roleRoutes[user?.role || 'WAITER'] || '/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex dot-grid" style={{ backgroundColor: '#0A0A0A' }}>
      {/* ── Left Brand Panel ── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-14 relative overflow-hidden border-r border-edge"
        style={{ backgroundColor: '#0D0D0D' }}
      >
        {/* Geometric decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Big neon border box - top left */}
          <div className="absolute top-12 left-12 w-32 h-32 border border-[rgba(255,45,120,0.2)]" />
          <div className="absolute top-16 left-16 w-32 h-32 border border-[rgba(255,45,120,0.1)]" />
          {/* Bottom right cross */}
          <div className="absolute bottom-24 right-16 w-40 h-40 border border-[rgba(0,255,179,0.15)]" />
          <div className="absolute bottom-20 right-12 w-40 h-40 border border-[rgba(0,255,179,0.08)]" />
          {/* Horizontal line accent */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-[rgba(255,45,120,0.06)]" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-neon-pink rounded flex items-center justify-center"
                 style={{ boxShadow: '3px 3px 0px rgba(255,45,120,0.4)' }}>
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[11px] font-black tracking-[0.2em] uppercase text-neon-pink">Indus POS</p>
              <p className="text-[9px] tracking-[0.15em] text-ink-muted uppercase font-bold">Command Center</p>
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-6xl font-black leading-none tracking-[-0.04em] text-white mb-2">
              INDUS
            </h1>
            <h1 className="text-6xl font-black leading-none tracking-[-0.04em] mb-4"
                style={{ color: '#FF2D78' }}>
              POS
            </h1>
            <p className="text-sm text-ink-secondary leading-relaxed max-w-xs font-medium">
              The brutally fast point-of-sale system built for the next generation of cafe operators.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="flex gap-8 mt-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {stats.map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl font-black text-white" style={{ letterSpacing: '-0.03em' }}>{value}</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted mt-0.5">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom version tag */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-2 border border-edge rounded">
            <span className="status-dot active" />
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-ink-secondary">System Online</span>
          </div>
        </div>
      </motion.div>

      {/* ── Right Login Form ── */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex items-center justify-center px-8 py-12"
      >
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-neon-pink rounded flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-black tracking-[-0.02em] text-white">INDUS POS</span>
          </div>

          {/* Form card */}
          <div className="bg-surface-1 border border-edge rounded p-7"
               style={{ boxShadow: '6px 6px 0px #FF2D78' }}>
            <div className="mb-7">
              <h2 className="text-xl font-black tracking-[-0.02em] text-white mb-1">SIGN IN</h2>
              <p className="text-xs text-ink-muted font-medium">Enter your credentials to access the dashboard.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@induspos.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-3.5 h-3.5" />}
                error={error && !email ? 'Email is required' : undefined}
                required
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-3.5 h-3.5" />}
                error={error && !password ? 'Password is required' : undefined}
                required
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[rgba(255,59,92,0.1)] border border-[rgba(255,59,92,0.25)] rounded"
                >
                  <span className="w-1.5 h-1.5 bg-danger rounded-full shrink-0" />
                  <p className="text-xs text-danger font-medium">{error}</p>
                </motion.div>
              )}

              <Button
                type="submit"
                loading={loading}
                className="w-full mt-2"
                size="lg"
                icon={!loading ? <ArrowRight className="w-4 h-4" /> : undefined}
              >
                Sign In
              </Button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-ink-muted">
            Received an invite?{' '}
            <a href="/set-password" className="text-neon-pink hover:underline font-bold">
              Set your password
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
