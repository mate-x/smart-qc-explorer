import { apiClient } from './client';

export interface ExportJobStatus {
  status: 'pending' | 'running' | 'completed' | 'failed';
  error: string | null;
  result: { saved_path: string; format: string } | null;
}

export const startExport = (expId: string, format: 'onnx' | 'openvino' | 'trt') =>
  apiClient.post<{ job_id: string }>(`/api/export/${expId}`, { format });

export const getExportJobStatus = (jobId: string) =>
  apiClient.get<ExportJobStatus>(`/api/export/job/${jobId}`);
