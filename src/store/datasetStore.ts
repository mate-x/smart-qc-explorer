import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DatasetValidateResponse } from '../types/dataset';

interface DatasetState {
  datasetPath: string | null;
  productName: string;
  datasetMeta: DatasetValidateResponse | null;
  setDataset: (path: string, meta: DatasetValidateResponse, productName: string) => void;
  clearDataset: () => void;
}

export const useDatasetStore = create<DatasetState>()(
  persist(
    (set) => ({
      datasetPath: null,
      productName: '',
      datasetMeta: null,
      setDataset: (path, meta, productName) =>
        set({ datasetPath: path, datasetMeta: meta, productName }),
      clearDataset: () => set({ datasetPath: null, datasetMeta: null, productName: '' }),
    }),
    {
      name: 'smart-qc-dataset-store',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
