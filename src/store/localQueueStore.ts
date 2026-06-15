import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PreprocessingConfig, ModelConfig } from '../types/config';

export interface LocalQueueItem {
  preprocessing_config: PreprocessingConfig;
  model_config: ModelConfig;
  set_id?: string;
  name?: string;
}

interface LocalQueueState {
  localItems: LocalQueueItem[];
  currentSetId: string | null;
  addLocalItem: (pre: PreprocessingConfig, model: ModelConfig, set_id?: string, name?: string) => void;
  deleteLocalItem: (index: number) => void;
  reorderLocalItem: (index: number, direction: 'up' | 'down') => void;
  clearLocalItems: () => void;
  getOrCreateSetId: () => string;
}

export const useLocalQueueStore = create<LocalQueueState>()(
  persist(
    (set) => ({
      localItems: [],
      currentSetId: null,

      addLocalItem: (pre, model, set_id, name) =>
        set((state) => ({
          localItems: [
            ...state.localItems,
            {
              preprocessing_config: pre,
              model_config: model,
              ...(set_id !== undefined ? { set_id } : {}),
              ...(name !== undefined ? { name } : {}),
            },
          ],
        })),

      deleteLocalItem: (index) =>
        set((state) => {
          const next = state.localItems.filter((_, i) => i !== index);
          return { localItems: next, ...(next.length === 0 ? { currentSetId: null } : {}) };
        }),

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

      clearLocalItems: () => set({ localItems: [], currentSetId: null }),

      getOrCreateSetId: () => {
        let id!: string;
        set((state) => {
          if (state.currentSetId) {
            id = state.currentSetId;
            return {};
          }
          id = 'SET_' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
          return { currentSetId: id };
        });
        return id;
      },
    }),
    {
      name: 'smart-qc-local-queue',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
