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

// image_path 형식: "{class}/{filename}" — #·공백 등 특수문자 인코딩, 슬래시는 경로 구분자로 유지
const encodeImagePath = (p: string) => p.split('/').map(encodeURIComponent).join('/');

export const getTripletImageUrl = (expId: string, imagePath: string) =>
  `http://localhost:8000/api/anomaly-map/${expId}/image/${encodeImagePath(imagePath)}/triplet`;

export const getOriginalImageUrl = (expId: string, imagePath: string) =>
  `http://localhost:8000/api/anomaly-map/${expId}/image/${encodeImagePath(imagePath)}/original`;

export const getGtMaskImageUrl = (expId: string, imagePath: string) =>
  `http://localhost:8000/api/anomaly-map/${expId}/image/${encodeImagePath(imagePath)}/gt_mask`;

export const getHeatmapImageUrl = (expId: string, imagePath: string) =>
  `http://localhost:8000/api/anomaly-map/${expId}/image/${encodeImagePath(imagePath)}/heatmap`;

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
