import { create } from 'zustand';
import type { TrainingStatusResponse } from '../types/training';

export interface LastResult {
  level: 'success' | 'warning' | 'error';
  msg: string;
}

interface TrainingState extends TrainingStatusResponse {
  batch_done: number;
  last_result: LastResult | null;
  ws_error: string | null;
  batch_queue_signal: number;

  setFromSnapshot: (snapshot: TrainingStatusResponse) => void;
  updateProgress: (step: number, total: number, loss: number, elapsed: number) => void;
  addLog: (message: string) => void;
  setStage: (idx: number, name: string) => void;
  setStatus: (status: TrainingStatusResponse['status']) => void;
  setPaused: (ckptPath: string) => void;
  setCompleted: (expId: string, auc: number, durationSecs: number, message: string, earlyStopped: boolean) => void;
  setStopped: () => void;
  incBatchDone: () => void;
  setBatchCompleted: (completed: number, failed: number, skipped: number) => void;
  bumpQueueSignal: () => void;
  clearLastResult: () => void;
  setWsError: (msg: string | null) => void;
  setCurrentModelType: (model_type: string | null) => void;
  clearRunData: () => void;
  reset: () => void;
}

const initialState: TrainingStatusResponse & {
  batch_done: number;
  last_result: LastResult | null;
  ws_error: string | null;
  batch_queue_signal: number;
} = {
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
  model_type: null,
  batch_done: 0,
  last_result: null,
  ws_error: null,
  batch_queue_signal: 0,
};

export const useTrainingStore = create<TrainingState>((set) => ({
  ...initialState,

  setFromSnapshot: (snapshot) =>
    set((prev) => ({
      ...snapshot,
      // HTTP snapshot이 늦게 resolve되어 WS가 설정한 running 상태를 idle로 덮어쓰는 race condition 방지
      status: prev.status === 'running' && snapshot.status === 'idle' ? 'running' : snapshot.status,
      // WS 재연결 시 진행 중이던 배치 카운트 초기화 방지
      batch_done: prev.batch_done,
      last_result: null,
      ws_error: null,
    })),

  updateProgress: (step, total, loss, elapsed) =>
    set((state) => {
      const last = state.loss_history[state.loss_history.length - 1];
      // stage가 바뀌어 step이 역행하면 last.step+1부터 이어서 단조 증가 유지
      const globalStep = !last || step > last.step ? step : last.step + 1;
      return {
        progress: { step, total, loss, elapsed },
        loss_history: [...state.loss_history, { step: globalStep, loss }],
      };
    }),

  addLog: (message) =>
    set((state) => ({
      log_lines: [...state.log_lines.slice(-99), message],
    })),

  setStage: (idx, name) => set({ current_stage_idx: idx, current_stage_name: name }),

  setStatus: (status) => set({ status }),

  setPaused: (ckptPath) => set({ status: 'paused', last_ckpt_path: ckptPath }),

  setCompleted: (_expId, auc, durationSecs, message, earlyStopped) => {
    const h = Math.floor(durationSecs / 3600);
    const m = Math.floor((durationSecs % 3600) / 60);
    const sec = Math.floor(durationSecs % 60);
    const durStr = h > 0 ? `${h}시간 ${m}분 ${sec}초` : m > 0 ? `${m}분 ${sec}초` : `${sec}초`;
    set({
      status: 'idle',
      progress: null,
      last_result: {
        level: 'success',
        msg: message || `${earlyStopped ? '[Early Stopping] ' : ''}학습 완료. AUC: ${auc.toFixed(4)} | ${durStr}`,
      },
    });
  },

  setStopped: () =>
    set({
      status: 'idle',
      progress: null,
      last_result: { level: 'warning', msg: '학습이 중단되었습니다.' },
    }),

  incBatchDone: () => set((s) => ({ batch_done: s.batch_done + 1 })),

  setBatchCompleted: (completed, failed, skipped) =>
    set({
      status: 'idle',
      batch_mode: false,
      progress: null,
      last_result: {
        level: failed > 0 ? 'warning' : 'success',
        msg: `일괄 학습 완료. 완료: ${completed}개 | 실패: ${failed}개 | 건너뜀: ${skipped}개`,
      },
    }),

  bumpQueueSignal: () => set((s) => ({ batch_queue_signal: s.batch_queue_signal + 1 })),

  clearLastResult: () => set({ last_result: null }),

  setWsError: (msg) => set({ ws_error: msg }),

  setCurrentModelType: (model_type) => set({ model_type }),

  clearRunData: () =>
    set({
      log_lines: [],
      loss_history: [],
      progress: null,
      current_stage_idx: null,
      current_stage_name: null,
    }),

  reset: () => set(initialState),
}));
