import { apiClient } from './client';
import type { Experiment } from '../types/experiments';

export const getExperiments = () =>
  apiClient.get<Experiment[]>('/api/experiments');

export const getExperiment = (expId: string) =>
  apiClient.get<Experiment>(`/api/experiments/${expId}`);

export const saveExperiment = (expId: string, save_path: string) =>
  apiClient.post<{ success: boolean; saved_path: string; size_mb: number; warning?: string }>(
    `/api/experiments/${expId}/save`,
    { save_path },
  );

export const deleteExperiment = (expId: string) =>
  apiClient.delete<{ success: boolean }>(`/api/experiments/${expId}`);
