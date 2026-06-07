import { apiClient } from './client';
import type {
  ConfigResponse,
  PreprocessingConfig,
  ModelConfig,
  ThresholdPreviewResponse,
  QueueItem,
} from '../types/config';

export const getConfig = () =>
  apiClient.get<ConfigResponse>('/api/config');

export const saveConfig = (
  preprocessing_config: PreprocessingConfig,
  model_config: ModelConfig,
) =>
  apiClient.post<{ preprocessing_config: PreprocessingConfig; model_config: ModelConfig }>(
    '/api/config',
    { preprocessing_config, model_config },
  );

export const previewThreshold = (threshold_method: string, threshold_value: number) =>
  apiClient.post<ThresholdPreviewResponse>('/api/config/preview', {
    threshold_method,
    threshold_value,
  });

export const getQueue = () =>
  apiClient.get<QueueItem[]>('/api/queue');

export const addToQueue = (
  preprocessing_config: PreprocessingConfig,
  model_config: ModelConfig,
  set_id?: string,
) =>
  apiClient.post<{ id: string; name: string }>('/api/queue', {
    preprocessing_config,
    model_config,
    ...(set_id ? { set_id } : {}),
  });

export const deleteQueueItem = (itemId: string) =>
  apiClient.delete<{ success: boolean }>(`/api/queue/${itemId}`);
