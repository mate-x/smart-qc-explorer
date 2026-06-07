export interface ExperimentMetrics {
  auc: number;
  f1: number;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f2_score?: number;
  confusion_matrix?: number[][];
  anomaly_scores?: number[];
  image_labels?: number[];
}

export interface Experiment {
  experiment_id: string;
  name: string;
  status: 'completed' | '중단' | '실패' | '건너뜀';
  created_at: string;
  model_type: 'efficientad' | 'patchcore';
  metrics: ExperimentMetrics | null;
  duration_seconds: number | null;
  model_path: string | null;
}
