import { create } from 'zustand';
import type { QueueItem } from '../types/config';
import * as configApi from '../api/configApi';

interface QueueState {
  loading: boolean;
  loadError: string | null;
  items: QueueItem[];
  loadQueue: () => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  reorderItem: (id: string, direction: 'up' | 'down') => Promise<void>;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  loading: true,
  loadError: null,
  items: [],

  loadQueue: async () => {
    set({ loading: true, loadError: null });
    try {
      const res = await configApi.getQueue();
      set({ items: res.data, loading: false });
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? '큐 로드 실패';
      set({ loadError: msg, loading: false });
    }
  },

  deleteItem: async (id) => {
    await configApi.deleteQueueItem(id);
    await get().loadQueue();
  },

  reorderItem: async (id, direction) => {
    try {
      await configApi.reorderQueueItem(id, direction);
    } catch { /* ignore */ }
    await get().loadQueue();
  },
}));
