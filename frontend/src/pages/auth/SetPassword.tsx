import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Coffee, Lock, Shield } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToastStore } from '../../store/useToastStore';
import api from '../../lib/api';

export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  // Decode role from token for display
  let roleFromToken = '';
  try {
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      roleFromToken = payload.role || '';
    }
  } catch {}

  const getStrength = (p: string) => {
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };

  const strength = getStrength(password);
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const strengthColors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-brand-light', 'bg-brand-main'];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await api.post('/auth/set-password', { token, password, confirmPassword });
      addToast('success', 'Password set successfully! You can now log in.');
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-1">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-text-primary mb-2">Invalid Link</h2>
          <p className="text-text-secondary mb-4">This invite link is invalid or has expired.</p>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-dark via-brand-mid to-brand-main items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-32 right-16 w-96 h-96 bg-brand-light/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-center px-12">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.3 }}
            className="inline-flex items-center justify-center w-24 h-24 bg-white/10 backdrop-blur-sm rounded-3xl mb-8">
            <Shield className="w-12 h-12 text-white" />
          </motion.div>
          <h1 className="font-display text-4xl font-extrabold text-white mb-4">Set Your Password</h1>
          <p className="text-xl text-brand-pale/80">Create a secure password to access your account.</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
        className="flex-1 flex items-center justify-center px-6 py-12 bg-surface-1">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-brand-main rounded-xl flex items-center justify-center">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-brand-dark">Café POS</span>
          </div>

          <h2 className="font-display text-3xl font-bold text-text-primary mb-2">Create Password</h2>
          {roleFromToken && (
            <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-pale text-brand-dark text-sm font-medium mb-6">
              <Shield className="w-3.5 h-3.5" /> Role: {roleFromToken}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div>
              <Input label="Password" type="password" placeholder="At least 6 characters" value={password}
                onChange={(e) => setPassword(e.target.value)} icon={<Lock className="w-4 h-4" />} required />
              {password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 flex gap-1">{[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? strengthColors[strength] : 'bg-gray-200'}`} />
                  ))}</div>
                  <span className="text-xs text-text-muted">{strengthLabels[strength]}</span>
                </div>
              )}
            </div>
            <Input label="Confirm Password" type="password" placeholder="Re-enter password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} icon={<Lock className="w-4 h-4" />}
              error={confirmPassword && password !== confirmPassword ? 'Passwords do not match' : undefined} required />
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-danger bg-danger-pale px-4 py-2.5 rounded-xl">
                {error}
              </motion.p>
            )}
            <Button type="submit" loading={loading} className="w-full" size="lg">Set Password</Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
