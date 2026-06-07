import { useEffect } from 'react';
import { useTrainingStore } from '../store/trainingStore';
import type { WsMessage, TrainingStatusResponse } from '../types/training';

const WS_URL = 'ws://localhost:8000/ws/training';

export function useTrainingWs() {
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof window.setTimeout>;
    let destroyed = false;

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
      s.updateProgress(msg.step, msg.total, msg.loss, msg.elapsed);
      break;

    case 'log':
      s.addLog(msg.message);
      break;

    case 'stage':
      s.setStage(msg.stage_idx, msg.stage_name);
      break;

    case 'paused':
      s.setPaused(msg.ckpt_path);
      break;

    case 'completed':
      s.setCompleted(msg.exp_id, msg.auc, msg.duration_seconds, msg.message, msg.early_stopped);
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
