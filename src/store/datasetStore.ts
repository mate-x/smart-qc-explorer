import { create } from 'zustand';
import type { DatasetValidateResponse } from '../types/dataset';

interface DatasetState {
  datasetPath: string | null;
  datasetMeta: DatasetValidateResponse | null;
  setDataset: (path: string, meta: DatasetValidateResponse) => void;
  clearDataset: () => void;
}

export const useDatasetStore = create<DatasetState>((set) => ({
  datasetPath: null,
  datasetMeta: null,
  setDataset: (path, meta) => set({ datasetPath: path, datasetMeta: meta }),
  clearDataset: () => set({ datasetPath: null, datasetMeta: null }),
}));
