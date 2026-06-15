import { apiClient } from './client';
import type {
  ConfigResponse,
  PreprocessingConfig,
  ModelConfig,
  ThresholdPreviewResponse,
  PreviewImageResponse,
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

export const clearQueue = () =>
  apiClient.delete<{ deleted: number }>('/api/queue');

export const reorderQueueItem = (itemId: string, direction: 'up' | 'down') =>
  apiClient.patch<{ success: boolean }>('/api/queue/reorder', { item_id: itemId, direction });

export const previewPreprocessing = (
  dataset_path: string,
  background_method: string,
  method: string,
  params: Record<string, unknown> | null,
  image_size: number,
) =>
  apiClient.post<PreviewImageResponse>('/api/config/preview-image', {
    dataset_path,
    background_method,
    method,
    params,
    image_size,
  });
