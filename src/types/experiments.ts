export interface ConfusionMatrix {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

export interface ExperimentMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
  f2_score?: number;
  auc?: number;
  confusion_matrix?: ConfusionMatrix;
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
  configs_path?: string | null;
  product_name?: string;
  set_id?: string | null;
  // 배치 비교 / 상세 표시용 추가 필드
  preprocessing_method?: string;
  preprocessing_params?: Record<string, unknown> | null;
  background_method?: 'none' | 'sam2';
  model_params?: Record<string, unknown>;
  threshold_method?: string;
  threshold_value?: number;
  dataset_path?: string;
  image_size?: number;
  early_stopped?: boolean;
}
