import { create } from 'zustand';
import type { TrainingStatusResponse } from '../types/training';

interface TrainingState extends TrainingStatusResponse {
  setFromSnapshot: (snapshot: TrainingStatusResponse) => void;
  updateProgress: (step: number, total: number, loss: number, elapsed: number) => void;
  addLog: (message: string) => void;
  setStage: (idx: number, name: string) => void;
  setStatus: (status: TrainingStatusResponse['status']) => void;
  reset: () => void;
}

const initialState: TrainingStatusResponse = {
  status: 'idle',
  exp_id: null,
  batch_mode: false,
  batch_total: 0,
  progress: null,
  current_stage_idx: null,
  current_stage_name: null,
  log_lines: [],
  loss_history: [],
  last_ckpt_path: null,
};

export const useTrainingStore = create<TrainingState>((set) => ({
  ...initialState,
  setFromSnapshot: (snapshot) => set(snapshot),
  updateProgress: (step, total, loss, elapsed) =>
    set((state) => ({
      progress: { step, total, loss, elapsed },
      loss_history: [...state.loss_history, { step, loss }],
    })),
  addLog: (message) =>
    set((state) => ({
      log_lines: [...state.log_lines.slice(-99), message],
    })),
  setStage: (idx, name) => set({ current_stage_idx: idx, current_stage_name: name }),
  setStatus: (status) => set({ status }),
  reset: () => set(initialState),
}));
