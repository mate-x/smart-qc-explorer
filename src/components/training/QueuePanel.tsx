import { useState, useEffect } from 'react';
import { useTrainingStore } from '../../store/trainingStore';
import { useConfigStore } from '../../store/configStore';
import { getQueue } from '../../api/queueApi';
import type { QueueItem } from '../../api/queueApi';
import { startBatchTraining, stopBatchTraining, skipBatchItem } from '../../api/trainingApi';

const STATUS_LABEL: Record<string, string> = {
  대기중: '대기',
  running: '실행 중',
  completed: '완료',
  failed: '실패',
  skipped: '건너뜀',
};

export default function QueuePanel() {
  const { status, batch_mode, batch_total, batch_done, batch_queue_signal } = useTrainingStore();
  const { preprocessingConfig, modelConfig } = useConfigStore();
  const hasConfig = !!(preprocessingConfig && modelConfig);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  async function loadQueue() {
    try {
      const res = await getQueue();
      setQueue(res.data);
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError((e as { message?: string })?.message ?? '큐 로드 실패');
    }
  }

  useEffect(() => {
    loadQueue();
  }, [batch_queue_signal]);

  const isRunning = status === 'running' || status === 'paused';

  if (queue.length === 0 && !batch_mode) return null;

  async function handleBatchStart() {
    setBatchLoading(true);
    setBatchError(null);
    try {
      await startBatchTraining();
    } catch (e: unknown) {
      const detail =
        (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setBatchError(
        typeof detail === 'string' ? detail : (e as { message?: string })?.message ?? '배치 시작 실패',
      );
    } finally {
      setBatchLoading(false);
    }
  }

  async function handleSkip() {
    setBatchError(null);
    try {
      await skipBatchItem();
    } catch (e: unknown) {
      setBatchError((e as { message?: string })?.message ?? '건너뜀 실패');
    }
  }

  async function handleBatchStop() {
    setBatchError(null);
    try {
      await stopBatchTraining();
    } catch (e: unknown) {
      setBatchError((e as { message?: string })?.message ?? '중단 실패');
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-medium text-gray-700">
          학습 대기열{' '}
          <span className="text-gray-400 font-normal">({queue.length}개)</span>
        </h3>

        {/* 배치 진행 상태 */}
        {batch_mode && isRunning && (
          <span className="text-xs text-gray-500">
            {batch_done} / {batch_total} 완료
          </span>
        )}

        {/* 제어 버튼 */}
        <div className="flex gap-2 items-center">
          {!isRunning && queue.length > 0 && (
            <button
              onClick={handleBatchStart}
              disabled={batchLoading || !hasConfig}
              title={!hasConfig ? 'Tab2에서 설정을 먼저 저장해 주세요' : undefined}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              {batchLoading ? '시작 중...' : '▶▶ 일괄 학습 시작'}
            </button>
          )}
          {isRunning && batch_mode && (
            <>
              <button
                onClick={handleSkip}
                className="px-3 py-1 border border-gray-300 text-xs rounded hover:bg-gray-50 cursor-pointer"
              >
                ⏭ 이번 건너뜀
              </button>
              <button
                onClick={handleBatchStop}
                className="px-3 py-1 border border-red-300 text-red-600 text-xs rounded hover:bg-red-50 cursor-pointer"
              >
                ⏹ 배치 중단
              </button>
            </>
          )}
        </div>
      </div>

      {loadError && <p className="text-xs text-red-600">{loadError}</p>}
      {batchError && <p className="text-xs text-red-600">{batchError}</p>}

      {queue.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {['#', '실험명', 'Set ID', '상태'].map((h) => (
                  <th
                    key={h}
                    className="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-600 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queue.map((item, idx) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-2 py-1.5 text-gray-400">{idx + 1}</td>
                  <td className="border border-gray-200 px-2 py-1.5 font-mono">{item.name}</td>
                  <td className="border border-gray-200 px-2 py-1.5 text-gray-500">
                    {item.set_id ?? '—'}
                  </td>
                  <td className="border border-gray-200 px-2 py-1.5">
                    <span
                      className={
                        item.status === 'running'
                          ? 'text-blue-600 font-medium'
                          : item.status === 'completed'
                          ? 'text-green-600'
                          : item.status === 'failed'
                          ? 'text-red-600'
                          : 'text-gray-500'
                      }
                    >
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-gray-400">대기 중인 항목이 없습니다.</p>
      )}
    </div>
  );
}
