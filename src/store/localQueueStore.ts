import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PreprocessingConfig, ModelConfig } from '../types/config';

export interface LocalQueueItem {
  preprocessing_config: PreprocessingConfig;
  model_config: ModelConfig;
  set_id?: string;
}

interface LocalQueueState {
  localItems: LocalQueueItem[];
  addLocalItem: (pre: PreprocessingConfig, model: ModelConfig, set_id?: string) => void;
  deleteLocalItem: (index: number) => void;
  reorderLocalItem: (index: number, direction: 'up' | 'down') => void;
  clearLocalItems: () => void;
}

export const useLocalQueueStore = create<LocalQueueState>()(
  persist(
    (set) => ({
      localItems: [],

      addLocalItem: (pre, model, set_id) =>
        set((state) => ({
          localItems: [
            ...state.localItems,
            {
              preprocessing_config: pre,
              model_config: model,
              ...(set_id !== undefined ? { set_id } : {}),
            },
          ],
        })),

      deleteLocalItem: (index) =>
        set((state) => ({
          localItems: state.localItems.filter((_, i) => i !== index),
        })),

      reorderLocalItem: (index, direction) =>
        set((state) => {
          const items = [...state.localItems];
          if (direction === 'up' && index > 0) {
            [items[index - 1], items[index]] = [items[index], items[index - 1]];
          } else if (direction === 'down' && index < items.length - 1) {
            [items[index], items[index + 1]] = [items[index + 1], items[index]];
          }
          return { localItems: items };
        }),

      clearLocalItems: () => set({ localItems: [] }),
    }),
    {
      name: 'smart-qc-local-queue',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
