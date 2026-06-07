import { apiClient } from './client';

export interface QueueItem {
  id: string;
  name: string;
  preprocessing_config: Record<string, unknown>;
  model_config: Record<string, unknown>;
  status: string;
  set_id: string | null;
}

export const getQueue = () => apiClient.get<QueueItem[]>('/api/queue');
