import { apiClient } from './client';
import type { TrainingStatusResponse, CheckpointInfo } from '../types/training';

export const startTraining = (experiment_name?: string) =>
  apiClient.post<{ exp_id: string; model_type: string | null }>('/api/training/start', { experiment_name });

export const resumeTraining = (checkpoint_name: string) =>
  apiClient.post<{ exp_id: string }>('/api/training/resume', { checkpoint_name });

export const pauseTraining = () =>
  apiClient.post<{ success: boolean; message: string }>('/api/training/pause');

export const unpauseTraining = () =>
  apiClient.post<{ success: boolean; message: string }>('/api/training/unpause');

export const stopTraining = () =>
  apiClient.post<{ success: boolean; message: string }>('/api/training/stop');

export const getTrainingStatus = () =>
  apiClient.get<TrainingStatusResponse>('/api/training/status');

export const getCheckpoints = () =>
  apiClient.get<{ checkpoints: CheckpointInfo[] }>('/api/training/checkpoints');

export const deleteCheckpoint = (name: string) =>
  apiClient.delete<{ success: boolean }>(`/api/training/checkpoints/${name}`);

export const startBatchTraining = () =>
  apiClient.post<{ exp_id: string; batch_total: number; model_type: string | null }>('/api/training/batch/start');

export const skipBatchItem = () =>
  apiClient.post<{ success: boolean; message: string }>('/api/training/batch/skip');

export const stopBatchTraining = () =>
  apiClient.post<{ success: boolean; message: string }>('/api/training/batch/stop');
