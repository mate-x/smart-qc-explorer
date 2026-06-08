import { create } from 'zustand';

interface AnomalyMapState {
  threshold: number | null;
  setThreshold: (value: number) => void;
}

export const useAnomalyMapStore = create<AnomalyMapState>((set) => ({
  threshold: null,
  setThreshold: (value) => set({ threshold: value }),
}));
