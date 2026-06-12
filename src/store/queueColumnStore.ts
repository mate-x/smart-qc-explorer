import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface QueueColumnState {
  commonOpen: boolean;
  efficientadOpen: boolean;
  patchcoreOpen: boolean;
  setCommonOpen: (open: boolean) => void;
  setEfficientadOpen: (open: boolean) => void;
  setPatchcoreOpen: (open: boolean) => void;
}

export const useQueueColumnStore = create<QueueColumnState>()(
  persist(
    (set) => ({
      commonOpen: true,
      efficientadOpen: false,
      patchcoreOpen: false,
      setCommonOpen: (open) => set({ commonOpen: open }),
      setEfficientadOpen: (open) => set({ efficientadOpen: open }),
      setPatchcoreOpen: (open) => set({ patchcoreOpen: open }),
    }),
    {
      name: 'smart-qc-queue-columns',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
