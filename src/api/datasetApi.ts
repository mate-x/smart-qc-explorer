import { apiClient } from './client';
import type { DatasetValidateResponse } from '../types/dataset';

export const validateDataset = (path: string) =>
  apiClient.post<DatasetValidateResponse>('/api/dataset/validate', { path });

export const getThumbnailUrl = (className: string, datasetPath: string) =>
  `http://localhost:8000/api/dataset/thumbnail/${encodeURIComponent(className)}?dataset_path=${encodeURIComponent(datasetPath)}`;
