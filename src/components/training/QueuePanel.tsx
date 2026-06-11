import { useState, useEffect } from 'react';
import { useTrainingStore } from '../../store/trainingStore';
import { useQueueStore } from '../../store/queueStore';
import { startBatchTraining, stopBatchTraining, skipBatchItem } from '../../api/trainingApi';

const STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  running: '실행 중',
  completed: '완료',
  failed: '실패',
  skipped: '건너뜀',
  stopped: '중단',
};

const STATUS_STYLE: Record<string, string> = {
  running: 'text-sky-600 font-semibold',
  completed: 'text-emerald-600',
  failed: 'text-red-500',
  skipped: 'text-slate-400',
  stopped: 'text-slate-400',
  pending: 'text-slate-500',
};

export default function QueuePanel() {
  const { status, batch_mode, batch_total, batch_done, batch_queue_signal, setCurrentModelType } = useTrainingStore();
  const { loading, loadError, items, loadQueue } = useQueueStore();

  const [batchLoading, setBatchLoading] = useState(false);
  const [batchPending, setBatchPending] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  useEffect(() => {
    loadQueue();
  }, [batch_queue_signal]); // eslint-disable-line react-hooks/exhaustive-deps

  const isRunning = status === 'running' || status === 'paused';
  const visibleQueue = items.filter((item) => item.status !== 'completed');
  const pendingCount = items.filter((item) => item.status === 'pending').length;

  useEffect(() => {
    if (isRunning) setBatchPending(false);
  }, [isRunning]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-center min-h-[60px]">
        <span className="text-xs text-slate-400 animate-pulse">큐 로딩 중...</span>
      </div>
    );
  }

  if (visibleQueue.length === 0 && !batch_mode) return null;

  async function handleBatchStart() {
    setBatchLoading(true);
    setBatchError(null);
    try {
      const res = await startBatchTraining();
      setCurrentModelType(res.data.model_type ?? null);
      setBatchPending(true);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setBatchError(typeof detail === 'string' ? detail : (e as { message?: string })?.message ?? '배치 시작 실패');
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-slate-800">
          학습 대기열
          <span className="ml-2 text-xs font-normal text-slate-400">({visibleQueue.length}개)</span>
        </h3>

        {batch_mode && isRunning && (
          <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {batch_done} / {batch_total} 완료
          </span>
        )}

        <div className="flex-1" />

        <div className="flex gap-2">
          {!isRunning && pendingCount > 0 && (
            <button
              onClick={handleBatchStart}
              disabled={batchLoading || batchPending}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
            >
              {batchLoading ? '시작 중...' : batchPending ? '첫 항목 준비 중...' : '▶▶ 일괄 학습 시작'}
            </button>
          )}
          {isRunning && batch_mode && (
            <>
              <button
                onClick={handleSkip}
                className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                ⏭ 이번 건너뜀
              </button>
              <button
                onClick={handleBatchStop}
                className="px-3 py-1.5 border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                ⏹ 배치 중단
              </button>
            </>
          )}
        </div>
      </div>

      {loadError && <p className="text-xs text-red-600">{loadError}</p>}
      {batchError && <p className="text-xs text-red-600">{batchError}</p>}

      {visibleQueue.length > 0 ? (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['#', '실험명', 'Set ID', '상태'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleQueue.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                  <td className="px-3 py-2 font-mono text-slate-700">{item.name}</td>
                  <td className="px-3 py-2 text-slate-500">{item.set_id ?? '—'}</td>
                  <td className={`px-3 py-2 ${STATUS_STYLE[item.status] ?? 'text-slate-500'}`}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-slate-400">대기 중인 항목이 없습니다.</p>
      )}
    </div>
  );
}
