export interface PreprocessingConfig {
  method: 'none' | 'homomorphic' | 'he' | 'clahe';
  resize_mode: 'padding';
  image_size: number;
  normalization: 'imagenet' | 'custom';
  mean: [number, number, number];
  std: [number, number, number];
  params: Record<string, unknown> | null;
}

export interface ModelConfig {
  model_type: 'efficientad' | 'patchcore';
  batch_size: number;
  random_seed: number;
  threshold_method: 'percentile' | 'absolute';
  threshold_value: number;
  params: Record<string, unknown>;
}

export interface DeviceInfo {
  device: 'cuda' | 'cpu';
  gpu_name?: string;
  vram_gb?: number;
}

export interface ConfigResponse {
  preprocessing_config: PreprocessingConfig;
  model_config: ModelConfig;
  device_info: DeviceInfo;
}

export interface QueueItem {
  id: string;
  name: string;
  preprocessing_config: PreprocessingConfig;
  model_config: ModelConfig;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
}

export interface ThresholdPreviewResponse {
  normal_ratio: number;
  defect_ratio: number;
}
