import { apiClient } from './client';
import type { AnomalyMapImagesResponse, JobStatusResponse } from '../types/anomalyMap';

export const buildAnomalyMap = (expId: string) =>
  apiClient.post<{ job_id: string }>(`/api/anomaly-map/${expId}/build`);

export const getJobStatus = (jobId: string) =>
  apiClient.get<JobStatusResponse>(`/api/anomaly-map/job/${jobId}`);

export const getAnomalyImages = (
  expId: string,
  threshold: number,
  defect_class?: string,
) =>
  apiClient.get<AnomalyMapImagesResponse>(`/api/anomaly-map/${expId}/images`, {
    params: { threshold, ...(defect_class ? { defect_class } : {}) },
  });

export const getTripletImageUrl = (expId: string, imagePath: string) =>
  `http://localhost:8000/api/anomaly-map/${expId}/image/${imagePath}/triplet`;

export const exportCsv = (expId: string, threshold: number, defect_class?: string) =>
  apiClient.get(`/api/anomaly-map/${expId}/export/csv`, {
    params: { threshold, ...(defect_class ? { defect_class } : {}) },
    responseType: 'blob',
  });

export const prepareZip = (expId: string, threshold: number, defect_class?: string) =>
  apiClient.post<{ job_id: string }>(`/api/anomaly-map/${expId}/export/zip`, {
    threshold,
    defect_class,
  });

export const downloadZip = (jobId: string) =>
  apiClient.get(`/api/anomaly-map/zip/${jobId}`, { responseType: 'blob' });
