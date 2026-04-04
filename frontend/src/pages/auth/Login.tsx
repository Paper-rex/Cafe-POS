import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Coffee, Mail, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';

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

      // Redirect based on role
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
    <div className="min-h-screen flex">
      {/* Left Brand Panel */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-dark via-brand-mid to-brand-main relative overflow-hidden items-center justify-center"
      >
        {/* Floating decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-32 right-16 w-96 h-96 bg-brand-light/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-accent/10 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 text-center px-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.3 }}
            className="inline-flex items-center justify-center w-24 h-24 bg-white/10 backdrop-blur-sm rounded-3xl mb-8"
          >
            <Coffee className="w-12 h-12 text-white" />
          </motion.div>

          <h1 className="font-display text-5xl font-extrabold text-white mb-4">
            Café POS
          </h1>
          <p className="text-xl text-brand-pale/80 max-w-md">
            Streamline your restaurant operations with our modern point-of-sale system.
          </p>

          {/* Decorative stats */}
          <div className="flex gap-8 justify-center mt-12">
            {[['Orders', '2.4K+'], ['Revenue', '₹8.5L'], ['Staff', '24']].map(([label, value]) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-display font-bold text-white">{value}</p>
                <p className="text-sm text-brand-pale/60">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Right Login Form */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex-1 flex items-center justify-center px-6 py-12 bg-surface-1"
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-brand-main rounded-xl flex items-center justify-center">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-brand-dark">Café POS</span>
          </div>

          <h2 className="font-display text-3xl font-bold text-text-primary mb-2">Welcome back</h2>
          <p className="text-text-secondary mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="you@cafe.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
              error={error && !email ? 'Email is required' : undefined}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
              error={error && !password ? 'Password is required' : undefined}
              required
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-danger bg-danger-pale px-4 py-2.5 rounded-xl"
              >
                {error}
              </motion.p>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Sign In
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-text-muted">
            Received an invite?{' '}
            <a href="/set-password" className="text-brand-main hover:text-brand-mid font-medium">
              Set your password
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
