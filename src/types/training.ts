export type TrainingStatus = 'idle' | 'running' | 'paused';

export interface TrainingProgress {
  step: number;
  total: number;
  loss: number;
  elapsed: number;
}

export interface LossPoint {
  step: number;
  loss: number;
}

export interface CheckpointInfo {
  name: string;
  model_type: string;
  created_at: string;
  step?: number;
  total_steps?: number;
  batch_idx?: number;
  total_batches?: number;
  n_patches?: number;
}

export interface TrainingStatusResponse {
  status: TrainingStatus;
  exp_id: string | null;
  batch_mode: boolean;
  batch_total: number;
  progress: TrainingProgress | null;
  current_stage_idx: number | null;
  current_stage_name: string | null;
  log_lines: string[];
  loss_history: LossPoint[];
  last_ckpt_path: string | null;
}

export type WsMessage =
  | ({ type: 'snapshot' } & TrainingStatusResponse)
  | { type: 'progress'; step: number; total: number; loss: number; elapsed: number }
  | { type: 'log'; message: string }
  | { type: 'stage'; stage_idx: number; stage_name: string }
  | { type: 'paused'; step: number; ckpt_path: string }
  | { type: 'completed'; exp_id: string; auc: number; duration_seconds: number; message: string }
  | { type: 'stopped'; step: number }
  | { type: 'error'; message: string; traceback: string }
  | { type: 'batch_item_started'; exp_id: string; queue_idx: number }
  | { type: 'batch_item_skipped' }
  | { type: 'batch_item_error'; traceback: string }
  | { type: 'batch_stopped'; step: number }
  | { type: 'batch_completed'; completed: number; failed: number; skipped: number };
