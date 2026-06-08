import { apiClient } from './client';
import type { AnomalyMapImagesResponse, AnomalyMapStatus, JobStatusResponse } from '../types/anomalyMap';

export const getBuildStatus = (expId: string) =>
  apiClient.get<AnomalyMapStatus>(`/api/anomaly-map/${expId}/status`);

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
    params: { threshold, ...(defect_class && defect_class !== '전체' ? { defect_class } : {}) },
  });

// image_path 형식: "{class}/{filename}"
export const getTripletImageUrl = (expId: string, imagePath: string) =>
  `http://localhost:8000/api/anomaly-map/${expId}/image/${imagePath}/triplet`;

export const getOriginalImageUrl = (expId: string, imagePath: string) =>
  `http://localhost:8000/api/anomaly-map/${expId}/image/${imagePath}/original`;

export const getGtMaskImageUrl = (expId: string, imagePath: string) =>
  `http://localhost:8000/api/anomaly-map/${expId}/image/${imagePath}/gt_mask`;

export const getHeatmapImageUrl = (expId: string, imagePath: string) =>
  `http://localhost:8000/api/anomaly-map/${expId}/image/${imagePath}/heatmap`;

export const exportCsv = (expId: string, threshold: number, defect_class?: string) =>
  apiClient.get(`/api/anomaly-map/${expId}/export/csv`, {
    params: { threshold, ...(defect_class && defect_class !== '전체' ? { defect_class } : {}) },
    responseType: 'blob',
  });

export const prepareZip = (expId: string, threshold: number, defect_class?: string) =>
  apiClient.post<{ job_id: string }>(`/api/anomaly-map/${expId}/export/zip`, {
    threshold,
    defect_class: defect_class ?? '전체',
  });

// 완료 시만 ZIP 반환, 미완료(진행중) 시 400 반환 → 폴링은 getJobStatus 사용
export const downloadZip = (jobId: string) =>
  apiClient.get(`/api/anomaly-map/zip/${jobId}`, { responseType: 'blob' });
