import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface BatchCompColumnState {
  learningOpen: boolean;
  metricsOpen: boolean;
  setLearningOpen: (v: boolean) => void;
  setMetricsOpen: (v: boolean) => void;
}

export const useBatchCompColumnStore = create<BatchCompColumnState>()(
  persist(
    (set) => ({
      learningOpen: true,
      metricsOpen: true,
      setLearningOpen: (v) => set({ learningOpen: v }),
      setMetricsOpen: (v) => set({ metricsOpen: v }),
    }),
    { name: 'smart-qc-batch-comp-columns', storage: createJSONStorage(() => sessionStorage) },
  ),
);
