import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface QueuePanelColumnState {
  commonOpen: boolean;
  efficientadOpen: boolean;
  patchcoreOpen: boolean;
  setCommonOpen: (v: boolean) => void;
  setEfficientadOpen: (v: boolean) => void;
  setPatchcoreOpen: (v: boolean) => void;
}

export const useQueuePanelColumnStore = create<QueuePanelColumnState>()(
  persist(
    (set) => ({
      commonOpen: false,
      efficientadOpen: false,
      patchcoreOpen: false,
      setCommonOpen: (v) => set({ commonOpen: v }),
      setEfficientadOpen: (v) => set({ efficientadOpen: v }),
      setPatchcoreOpen: (v) => set({ patchcoreOpen: v }),
    }),
    { name: 'smart-qc-queue-panel-columns', storage: createJSONStorage(() => sessionStorage) },
  ),
);
