import { apiClient } from './client';
import type { Experiment } from '../types/experiments';

export const getExperiments = () =>
  apiClient.get<Experiment[]>('/api/experiments');

export const deleteExperiment = (expId: string) =>
  apiClient.delete<{ success: boolean }>(`/api/experiments/${expId}`);
