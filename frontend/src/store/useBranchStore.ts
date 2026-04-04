import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Branch } from '../types';

interface BranchState {
  // Available branches the user has access to
  availableBranches: Branch[];
  setAvailableBranches: (branches: Branch[]) => void;

  // Currently selected branch
  selectedBranchId: string | null;
  setSelectedBranchId: (id: string | null) => void;

  // Clear store
  clearBranchStore: () => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      availableBranches: [],
      setAvailableBranches: (branches) => set({ availableBranches: branches }),

      selectedBranchId: null,
      setSelectedBranchId: (id) => set({ selectedBranchId: id }),

      clearBranchStore: () => set({ availableBranches: [], selectedBranchId: null }),
    }),
    {
      name: 'branch-storage',
    }
  )
);
