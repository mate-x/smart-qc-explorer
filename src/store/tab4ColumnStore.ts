import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Tab4ColumnState {
  basicsOpen: boolean;
  metricsOpen: boolean;
  setBasicsOpen: (v: boolean) => void;
  setMetricsOpen: (v: boolean) => void;
}

export const useTab4ColumnStore = create<Tab4ColumnState>()(
  persist(
    (set) => ({
      basicsOpen: true,
      metricsOpen: true,
      setBasicsOpen: (v) => set({ basicsOpen: v }),
      setMetricsOpen: (v) => set({ metricsOpen: v }),
    }),
    { name: 'smart-qc-tab4-columns', storage: createJSONStorage(() => sessionStorage) },
  ),
);
