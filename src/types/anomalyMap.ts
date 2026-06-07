export interface AnomalyImage {
  image_name: string;
  defect_class: string;
  anomaly_score: number;
  verdict: string;
  gt_match: boolean;
  classification: string;
  image_path: string;
}

export interface AnomalyMapImagesResponse {
  images: AnomalyImage[];
  score_max: number;
  score_avg: number;
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface JobStatusResponse {
  status: JobStatus;
  error?: string;
}
