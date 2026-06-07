import { create } from 'zustand';

interface ExperimentsState {
  selectedExperimentId: string | null;
  setSelectedExperimentId: (id: string | null) => void;
}

export const useExperimentsStore = create<ExperimentsState>((set) => ({
  selectedExperimentId: null,
  setSelectedExperimentId: (id) => set({ selectedExperimentId: id }),
}));
