import { useState, useRef, useEffect } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useBranchStore } from '../../store/useBranchStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function BranchSelector() {
  const user = useAuthStore((s) => s.user);
  const { availableBranches, setAvailableBranches, selectedBranchId, setSelectedBranchId } = useBranchStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // For non-admin users, populate branches from user payload
  useEffect(() => {
    if (user && user.role !== 'ADMIN' && user.branches && user.branches.length > 0) {
      setAvailableBranches(user.branches);
      if (!selectedBranchId || !user.branches.find(b => b.id === selectedBranchId)) {
        setSelectedBranchId(user.branches[0].id);
      }
    }
  }, [user, setAvailableBranches, selectedBranchId, setSelectedBranchId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!user || user.role === 'ADMIN' || !user.branches || user.branches.length <= 1) {
    return null; // Admin has their own selector, single-branch users don't need one
  }

  const selectedBranch = availableBranches.find(b => b.id === selectedBranchId);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-surface-2 hover:bg-surface-2-hover rounded-lg transition-colors border border-border"
      >
        <MapPin className="w-4 h-4 text-brand" />
        <span className="text-sm font-medium text-text max-w-[120px] truncate">
          {selectedBranch?.name || 'Select Branch'}
        </span>
        <ChevronDown className="w-4 h-4 text-text-muted" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-48 bg-surface-1 shadow-soft-xl border border-border rounded-xl z-50 overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto w-full p-1 scrollbar-none">
              {availableBranches.map(branch => (
                <button
                  key={branch.id}
                  onClick={() => {
                    setSelectedBranchId(branch.id);
                    setIsOpen(false);
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
