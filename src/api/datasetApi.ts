import { apiClient } from './client';
import type { DatasetValidateResponse } from '../types/dataset';

export const validateDataset = (path: string, product_name?: string) =>
  apiClient.post<DatasetValidateResponse>('/api/dataset/validate', {
    path,
    ...(product_name ? { product_name } : {}),
  });

export const getThumbnailUrl = (className: string, datasetPath: string) =>
  `http://localhost:8000/api/dataset/thumbnail/${encodeURIComponent(className)}?dataset_path=${encodeURIComponent(datasetPath)}`;
