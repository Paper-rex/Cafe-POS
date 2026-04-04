import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Package, Map, CreditCard,
  Clock, BarChart3, LogOut, Coffee, ChevronDown, Plus, X
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useBranchStore } from '../../store/useBranchStore';
import api from '../../lib/api';

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

  const { availableBranches, setAvailableBranches, selectedBranchId, setSelectedBranchId } = useBranchStore();
  const [activeSession, setActiveSession] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [showAddBranch, setShowAddBranch] = useState(false);
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
  }, [setAvailableBranches]); // selectedBranchId is intentionally omitted to avoid resetting

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

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    try {
      const { data } = await api.post('/branches', { name: newBranchName.trim() });
      setAvailableBranches([...availableBranches, data]);
      setSelectedBranchId(data.id);
      setShowAddBranch(false);
      setNewBranchName('');
      setIsBranchDropdownOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const selectedBranch = availableBranches.find(b => b.id === selectedBranchId);

  return (
    <div className="min-h-screen flex bg-surface-1">
      {/* Sidebar */}
      <aside className="w-60 bg-brand-mid flex flex-col shrink-0 sticky top-0 h-screen z-20">
        {/* Logo */}
        <div className="px-5 py-6 flex items-center gap-3">
          <div className="w-9 h-9 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center">
            <Coffee className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-xl font-extrabold text-white tracking-tight">Café POS</span>
        </div>

        {/* Branch Selector */}
        <div className="px-3 mb-4 relative" ref={dropdownRef}>
          <button
            onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5"
          >
            <div className="flex flex-col items-start truncate">
              <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Current Branch</span>
              <span className="text-sm font-semibold text-white truncate w-full text-left">
                {selectedBranch?.name || 'Loading...'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-white/50 shrink-0" />
          </button>

          {/* Branch Dropdown */}
          <AnimatePresence>
            {isBranchDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-3 right-3 mt-2 bg-surface-1 border border-border shadow-soft-xl rounded-xl z-50 overflow-hidden"
              >
                <div className="max-h-48 overflow-y-auto w-full p-1 scrollbar-none">
                  {availableBranches.map(branch => (
                    <button
                      key={branch.id}
                      onClick={() => {
                        setSelectedBranchId(branch.id);
                        setIsBranchDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                        selectedBranchId === branch.id
                          ? 'bg-brand/10 text-brand font-medium'
                          : 'text-text hover:bg-surface-2'
                      }`}
                    >
                      {branch.name}
                    </button>
                  ))}
                </div>
                <div className="p-1 border-t border-border">
                  <button
                    onClick={() => {
                      setShowAddBranch(true);
                      setIsBranchDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand hover:bg-brand/10 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Branch</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-white/15 text-white border-l-3 border-accent'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.label === 'Session' && activeSession && (
                <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Session Active" />
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center text-accent text-sm font-bold">
              {(user?.name || user?.email || 'A')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || user?.email}</p>
              <p className="text-xs text-white/50">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 mt-1 w-full rounded-xl text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relaiive">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-8"
        >
          {selectedBranchId ? <Outlet key={selectedBranchId} /> : (
             <div className="flex bg-surface-2 p-10 rounded-2xl w-full h-full justify-center text-text-muted mt-20">
                You must select or create a branch first.
             </div>
          )}
        </motion.div>
      </main>

      {/* Add Branch Modal */}
      <AnimatePresence>
        {showAddBranch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-text/20 backdrop-blur-sm"
              onClick={() => setShowAddBranch(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-surface-1 rounded-2xl shadow-soft-2xl overflow-hidden border border-border"
            >
              <div className="px-6 py-4 flex items-center justify-between border-b border-border bg-surface-2/50">
                <h3 className="text-lg font-bold text-text">Add New Branch</h3>
                <button
                  onClick={() => setShowAddBranch(false)}
                  className="p-1.5 hover:bg-surface-2 rounded-lg text-text-muted hover:text-text transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddBranch} className="p-6">
                <p className="text-sm text-text-muted mb-4">
                  Create a new operational branch. This branch will be available to all selected users.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-1.5">Branch Name</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      placeholder="e.g. Downtown Cafe"
                      className="w-full px-4 py-2.5 bg-surface-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddBranch(false)}
                    className="px-5 py-2.5 text-sm font-medium text-text hover:bg-surface-2 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newBranchName.trim()}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-brand hover:bg-brand-dark rounded-xl transition-colors disabled:opacity-50"
                  >
                    Create Branch
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
