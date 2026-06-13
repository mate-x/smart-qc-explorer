import type { EfficientAdParamsState, PatchCoreParamsState } from './modelParams';

export type { EfficientAdParamsState, PatchCoreParamsState };

export interface PreprocessingConfig {
  method: 'none' | 'homomorphic' | 'he' | 'clahe';
  background_method: 'none' | 'sam2' | 'sam3';
  resize_mode: 'padding';
  image_size: number;
  normalization: 'imagenet';
  mean: [number, number, number];
  std: [number, number, number];
  params: Record<string, unknown> | null;
}

export interface EfficientAdModelConfig {
  model_type: 'efficientad';
  batch_size: number;
  random_seed: number;
  threshold_method: 'percentile' | 'absolute';
  threshold_value: number;
  params: EfficientAdParamsState;
}

export interface PatchCoreModelConfig {
  model_type: 'patchcore';
  batch_size: number;
  random_seed: number;
  threshold_method: 'percentile' | 'absolute';
  threshold_value: number;
  params: PatchCoreParamsState;
}

export type ModelConfig = EfficientAdModelConfig | PatchCoreModelConfig;

export interface DeviceInfo {
  device: 'cuda' | 'cpu';
  gpu_name?: string;
  vram_gb?: number;
  openvino_available?: boolean;
  trt_available?: boolean;
}

export interface ConfigResponse {
  preprocessing_config: PreprocessingConfig | null;
  model_config: ModelConfig | null;
  device_info: DeviceInfo;
}

export interface QueueItem {
  id: string;
  name: string;
  preprocessing_config: PreprocessingConfig;
  model_config: ModelConfig;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'stopped';
  set_id?: string | null;
}

export interface ThresholdPreviewResponse {
  normal_ratio: number | null;
  defect_ratio: number | null;
}

export interface PreviewImageResponse {
  original_b64: string;
  processed_b64: string;
  warning: string | null;
}
