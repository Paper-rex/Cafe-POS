import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Package, Map, CreditCard,
  Clock, BarChart3, LogOut, ChevronDown, Plus, X, Zap, Trash2, Edit2
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useBranchStore } from '../../store/useBranchStore';
import api from '../../lib/api';
import { useSSE } from '../../hooks/useSSE';
import { useToastStore } from '../../store/useToastStore';

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
  const addToast = useToastStore((s) => s.addToast);

  const { availableBranches, setAvailableBranches, selectedBranchId, setSelectedBranchId } = useBranchStore();
  const [activeSession, setActiveSession] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [newBranchName, setNewBranchName] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const { data } = await api.get('/branches');
        setAvailableBranches(data);
        if (!selectedBranchId && data.length > 0) {
          setSelectedBranchId(data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchBranches();
  }, [setAvailableBranches]);

  useSSE({
    onPaymentConfirmed: (payload) => {
      if (payload?.source === 'ONLINE_SELF_ORDER') {
        addToast('success', payload?.message || `Online Payment Received for Order #${payload?.orderNumber || ''}`);
      }
    },
  });

  useEffect(() => {
    const checkSession = async () => {
      if (!selectedBranchId) return;
      try {
        const { data } = await api.get(`/session/active?branchId=${selectedBranchId}`);
        setActiveSession(!!data);
      } catch {
        setActiveSession(false);
      }
    };
    checkSession();
    const interval = setInterval(checkSession, 30000);
    return () => clearInterval(interval);
  }, [selectedBranchId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
    };
    if (isBranchDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isBranchDropdownOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleEditBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch || !newBranchName.trim()) return;
    try {
      const { data } = await api.patch(`/branches/${editingBranch.id}`, { name: newBranchName.trim() });
      setAvailableBranches(availableBranches.map(b => b.id === data.id ? data : b));
      addToast('success', 'Branch renamed');
      setEditingBranch(null);
      setNewBranchName('');
      setIsBranchDropdownOpen(false);
    } catch (err) {
      console.error(err);
      addToast('error', 'Failed to rename branch');
    }
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    try {
      const { data } = await api.post('/branches', { name: newBranchName.trim() });
      setAvailableBranches([...availableBranches, data]);
      setSelectedBranchId(data.id);
      addToast('success', 'Branch created');
      setShowAddBranch(false);
      setNewBranchName('');
      setIsBranchDropdownOpen(false);
    } catch (err) {
      console.error(err);
      addToast('error', 'Failed to create branch');
    }
  };

  const handleDeleteBranch = async (branchId: string, branchName: string) => {
    if (availableBranches.length <= 1) {
      addToast('error', 'At least one branch is required.');
      return;
    }

    const confirmed = window.confirm(
      `Delete branch "${branchName}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/branches/${branchId}`);

      const nextBranches = availableBranches.filter((branch) => branch.id !== branchId);
      setAvailableBranches(nextBranches);

      if (selectedBranchId === branchId) {
        setSelectedBranchId(nextBranches[0]?.id ?? null);
      }

      addToast('success', `Deleted branch: ${branchName}`);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Failed to delete branch';
      addToast('error', message);
    }
  };

  const selectedBranch = availableBranches.find(b => b.id === selectedBranchId);
  const userInitial = (user?.name || user?.email || 'A')[0].toUpperCase();

  return (
    <div className="min-h-screen flex dot-grid" style={{ backgroundColor: '#0A0A0A' }}>
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className="w-56 flex flex-col shrink-0 sticky top-0 h-screen z-20 border-r border-edge" style={{ backgroundColor: '#0D0D0D' }}>

        {/* Logo */}
        <div className="px-5 py-5 border-b border-edge">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-neon-pink rounded flex items-center justify-center shrink-0"
                 style={{ boxShadow: '2px 2px 0px rgba(255,45,120,0.4)' }}>
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[15px] font-black tracking-[-0.03em] text-white">INDUS POS</p>
              <p className="text-[9px] tracking-[0.15em] uppercase text-ink-muted font-bold">Admin Console</p>
            </div>
          </div>
        </div>

        {/* Branch Selector */}
        <div className="px-3 py-3 border-b border-edge" ref={dropdownRef}>
          <p className="text-[9px] font-black tracking-[0.15em] uppercase text-ink-muted mb-2 px-1">Current Branch</p>
          <button
            onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-surface-2 hover:bg-surface-3 border border-edge rounded transition-colors text-left group"
          >
            <span className="text-xs font-semibold text-ink-primary truncate">
              {selectedBranch?.name || 'Select Branch...'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-ink-muted shrink-0 transition-transform ${isBranchDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isBranchDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.12 }}
                className="absolute mt-1 left-3 right-3 bg-surface-2 border border-edge rounded z-50 overflow-hidden"
                style={{ boxShadow: '4px 4px 0px #FF2D78' }}
              >
                <div className="max-h-36 overflow-y-auto p-1">
                  {availableBranches.map(branch => (
                    <div
                      key={branch.id}
                      className={`w-full flex items-center gap-1 rounded transition-colors ${
                        selectedBranchId === branch.id
                          ? 'bg-[rgba(255,45,120,0.12)] text-neon-pink'
                          : 'text-ink-secondary hover:bg-surface-3 hover:text-ink-primary'
                      }`}
                    >
                      <button
                        onClick={() => { setSelectedBranchId(branch.id); setIsBranchDropdownOpen(false); }}
                        className="flex-1 text-left px-3 py-2 text-xs font-bold"
                      >
                        {branch.name}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingBranch(branch);
                          setNewBranchName(branch.name);
                        }}
                        className="p-1.5 rounded text-ink-muted hover:text-neon-pink hover:bg-[rgba(255,45,120,0.12)]"
                        title="Rename branch"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBranch(branch.id, branch.name);
                        }}
                        disabled={availableBranches.length <= 1}
                        title={availableBranches.length <= 1 ? 'Cannot delete the last branch' : 'Delete branch'}
                        className="mr-1 p-1.5 rounded text-ink-muted hover:text-danger hover:bg-[rgba(255,59,92,0.12)] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="p-1 border-t border-edge">
                  <button
                    onClick={() => { setShowAddBranch(true); setIsBranchDropdownOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-neon-pink hover:bg-[rgba(255,45,120,0.08)] rounded transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Branch</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded text-xs font-bold uppercase tracking-wide transition-all duration-150
                ${isActive
                  ? 'bg-[rgba(255,45,120,0.1)] text-white border-l-2 border-neon-pink pl-2.5'
                  : 'text-ink-muted hover:bg-surface-2 hover:text-ink-secondary border-l-2 border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="flex-1">{item.label}</span>
                  {item.label === 'Session' && activeSession && (
                    <span className="status-dot active" title="Session Active" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        <div className="px-3 py-4 border-t border-edge">
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <div className="w-7 h-7 bg-neon-pink rounded flex items-center justify-center text-white text-xs font-black shrink-0">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-ink-primary truncate">{user?.name || user?.email}</p>
              <p className="text-[9px] font-black tracking-[0.1em] uppercase text-neon-pink">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-2 py-2 w-full rounded text-xs font-bold uppercase tracking-wide text-ink-muted hover:bg-surface-2 hover:text-danger transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="p-7"
        >
          {selectedBranchId ? <Outlet key={selectedBranchId} /> : (
            <div className="flex flex-col items-center justify-center bg-surface-2 border border-edge rounded p-16 mt-20"
                 style={{ boxShadow: '4px 4px 0px #FF2D78' }}>
              <Zap className="w-10 h-10 text-neon-pink mb-4" />
              <p className="text-sm font-bold text-ink-secondary">Select or create a branch to continue.</p>
            </div>
          )}
        </motion.div>
      </main>

      {/* ── Add Branch Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showAddBranch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70" onClick={() => setShowAddBranch(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-surface-1 border border-edge rounded overflow-hidden"
              style={{ boxShadow: '6px 6px 0px #FF2D78', borderTop: '2px solid #FF2D78' }}
            >
              <div className="px-6 py-4 flex items-center justify-between border-b border-edge">
                <h3 className="text-xs font-black tracking-[0.1em] uppercase text-ink-primary">Add New Branch</h3>
                <button onClick={() => setShowAddBranch(false)} className="text-ink-muted hover:text-ink-primary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleAddBranch} className="p-6">
                <p className="text-xs text-ink-muted mb-5 leading-relaxed">
                  Create a new operational branch. This branch will be available to all selected users.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black tracking-[0.12em] uppercase text-ink-secondary mb-2">
                      Branch Name
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      placeholder="e.g. Downtown Indus"
                      className="w-full px-4 py-2.5 bg-surface-2 border border-edge rounded text-sm text-ink-primary placeholder:text-ink-muted focus:border-neon-pink outline-none transition-colors"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddBranch(false)}
                    className="px-5 py-2 text-xs font-bold uppercase tracking-wide text-ink-secondary hover:text-ink-primary hover:bg-surface-2 rounded transition-colors border border-edge"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newBranchName.trim()}
                    className="px-5 py-2 text-xs font-bold uppercase tracking-wide text-white bg-neon-pink rounded transition-all disabled:opacity-40"
                    style={{ boxShadow: '3px 3px 0px rgba(255,45,120,0.4)' }}
                  >
                    Create Branch
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit Branch Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {editingBranch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70" onClick={() => setEditingBranch(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-surface-1 border border-edge rounded overflow-hidden"
              style={{ boxShadow: '6px 6px 0px #FF2D78', borderTop: '2px solid #FF2D78' }}
            >
              <div className="px-6 py-4 flex items-center justify-between border-b border-edge">
                <h3 className="text-xs font-black tracking-[0.1em] uppercase text-ink-primary">Rename Branch</h3>
                <button onClick={() => setEditingBranch(null)} className="text-ink-muted hover:text-ink-primary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleEditBranch} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black tracking-[0.12em] uppercase text-ink-secondary mb-2">
                      New Branch Name
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      placeholder="e.g. Downtown Indus"
                      className="w-full px-4 py-2.5 bg-surface-2 border border-edge rounded text-sm text-ink-primary placeholder:text-ink-muted focus:border-neon-pink outline-none transition-colors"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingBranch(null)}
                    className="px-5 py-2 text-xs font-bold uppercase tracking-wide text-ink-secondary hover:text-ink-primary hover:bg-surface-2 rounded transition-colors border border-edge"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newBranchName.trim() || newBranchName.trim() === editingBranch.name}
                    className="px-5 py-2 text-xs font-bold uppercase tracking-wide text-white bg-neon-pink rounded transition-all disabled:opacity-40"
                    style={{ boxShadow: '3px 3px 0px rgba(255,45,120,0.4)' }}
                  >
                    Rename Branch
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
