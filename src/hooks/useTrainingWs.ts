import { useEffect } from 'react';
import { useTrainingStore } from '../store/trainingStore';
import { getTrainingStatus } from '../api/trainingApi';
import type { WsMessage, TrainingStatusResponse } from '../types/training';

const WS_URL = 'ws://localhost:8000/ws/training';

export function useTrainingWs() {
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof window.setTimeout>;
    let destroyed = false;

    // WS 스냅샷에만 의존하면 재연결 타이밍에 상태를 놓칠 수 있으므로
    // HTTP로 현재 상태를 즉시 동기화한 뒤 WS를 연결한다
    getTrainingStatus()
      .then((res) => {
        if (!destroyed) dispatch({ type: 'snapshot', ...res.data });
      })
      .catch(() => {});

    function connect() {
      ws = new WebSocket(WS_URL);

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as WsMessage;
          dispatch(msg);
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        if (!destroyed) {
          reconnectTimer = window.setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      destroyed = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);
}

function dispatch(msg: WsMessage) {
  const s = useTrainingStore.getState();

  switch (msg.type) {
    case 'snapshot':
      s.setFromSnapshot(msg as TrainingStatusResponse);
      break;

    case 'progress':
      if (s.status === 'idle') s.setStatus('running');
      s.updateProgress(msg.step, msg.total, msg.loss, msg.elapsed);
      break;

    case 'log':
      if (s.status === 'idle') s.setStatus('running');
      s.addLog(msg.message);
      break;

    case 'stage':
      if (s.status === 'idle') s.setStatus('running');
      s.setStage(msg.stage_idx, msg.stage_name);
      break;

    case 'paused':
      s.setPaused(msg.ckpt_path);
      break;

    case 'completed':
      s.setCompleted(msg.exp_id, msg.auc, msg.duration_seconds, msg.message, msg.early_stopped);
      if (s.batch_mode) s.incBatchDone();
      s.bumpQueueSignal();
      break;

    case 'stopped':
      s.setStopped();
      break;

    case 'error':
      s.setWsError(msg.message);
      s.setStatus('idle');
      break;

    case 'batch_item_started':
      s.setStatus('running');
      s.setCurrentModelType(msg.model_type ?? null);
      s.bumpQueueSignal();
      break;

    case 'batch_item_skipped':
    case 'batch_item_error':
      s.incBatchDone();
      s.bumpQueueSignal();
      break;

    case 'batch_stopped':
      s.setStopped();
      s.bumpQueueSignal();
      break;

    case 'batch_completed':
      s.setBatchCompleted(msg.completed, msg.failed, msg.skipped);
      s.bumpQueueSignal();
      break;
  }
}
