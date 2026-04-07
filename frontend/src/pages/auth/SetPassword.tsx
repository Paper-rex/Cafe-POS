import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Shield, Zap, ArrowRight } from 'lucide-react';
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
  const strengthColors = ['', '#FF3B5C', '#FF6B2B', '#FFE600', '#00FFB3', '#00FFB3'];

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
      <div className="min-h-screen flex items-center justify-center dot-grid" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="text-center bg-surface-1 border border-edge rounded p-10"
             style={{ boxShadow: '6px 6px 0px #FF3B5C' }}>
          <div className="w-12 h-12 bg-[rgba(255,59,92,0.12)] border border-[rgba(255,59,92,0.25)] rounded flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-danger" />
          </div>
          <h2 className="text-lg font-black uppercase tracking-[-0.01em] text-ink-primary mb-2">Invalid Link</h2>
          <p className="text-xs text-ink-muted mb-6 leading-relaxed">This invite link is invalid or has expired.</p>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex dot-grid" style={{ backgroundColor: '#0A0A0A' }}>
      {/* Left Panel */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-14 relative overflow-hidden border-r border-edge"
        style={{ backgroundColor: '#0D0D0D' }}
      >
        {/* Geometric decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-12 right-12 w-32 h-32 border border-[rgba(0,255,179,0.2)]" />
          <div className="absolute top-16 right-16 w-32 h-32 border border-[rgba(0,255,179,0.1)]" />
          <div className="absolute bottom-24 left-16 w-40 h-40 border border-[rgba(255,45,120,0.15)]" />
          <div className="absolute bottom-20 left-12 w-40 h-40 border border-[rgba(255,45,120,0.08)]" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neon-pink rounded flex items-center justify-center"
                 style={{ boxShadow: '3px 3px 0px rgba(255,45,120,0.4)' }}>
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[11px] font-black tracking-[0.2em] uppercase text-neon-pink">Indus POS</p>
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          <h1 className="text-5xl font-black leading-none tracking-[-0.04em] text-white mb-2">
            SECURE
          </h1>
          <h1 className="text-5xl font-black leading-none tracking-[-0.04em] text-neon-mint mb-5">
            ACCESS
          </h1>
          <p className="text-sm text-ink-secondary leading-relaxed max-w-xs font-medium">
            Set a strong password to protect your Indus POS account. You only need to do this once.
          </p>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-2 border border-edge rounded">
            <Shield className="w-3 h-3 text-neon-mint" />
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-ink-secondary">Invite-Only Access</span>
          </div>
        </div>
      </motion.div>

      {/* Right Form */}
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
               style={{ boxShadow: '6px 6px 0px #00FFB3' }}>
            <div className="mb-6">
              <h2 className="text-xl font-black tracking-[-0.02em] text-white mb-1">SET PASSWORD</h2>
              <p className="text-xs text-ink-muted leading-relaxed">Create a secure password for your account.</p>
              {roleFromToken && (
                <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 bg-[rgba(0,255,179,0.1)] border border-[rgba(0,255,179,0.25)] rounded">
                  <Shield className="w-3 h-3 text-neon-mint" />
                  <span className="text-[10px] font-black uppercase tracking-[0.1em] text-neon-mint">Role: {roleFromToken}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  label="New Password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock className="w-3.5 h-3.5" />}
                  required
                />
                {password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-none transition-colors duration-200"
                          style={{ backgroundColor: i <= strength ? strengthColors[strength] : '#2A2A2A' }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em]"
                          style={{ color: strengthColors[strength] || '#505050' }}>
                      {strengthLabels[strength]}
                    </span>
                  </div>
                )}
              </div>

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock className="w-3.5 h-3.5" />}
                error={confirmPassword && password !== confirmPassword ? 'Passwords do not match' : undefined}
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
                className="w-full mt-1"
                size="lg"
                variant="mint"
                icon={!loading ? <ArrowRight className="w-4 h-4" /> : undefined}
              >
                Set Password
              </Button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-ink-muted">
            Already have a password?{' '}
            <a href="/login" className="text-neon-pink hover:underline font-bold">
              Sign In
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
