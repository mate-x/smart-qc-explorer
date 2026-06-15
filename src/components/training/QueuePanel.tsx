import { useState, useEffect } from 'react';
import { useTrainingStore } from '../../store/trainingStore';
import { useConfigStore } from '../../store/configStore';
import { getQueue, deleteQueueItem } from '../../api/configApi';
import type { QueueItem } from '../../types/config';
import { startBatchTraining, stopBatchTraining, skipBatchItem } from '../../api/trainingApi';

const STATUS_LABEL: Record<string, string> = {
  pending:   '대기',
  대기중:    '대기',
  running:   '실행 중',
  completed: '완료',
  failed:    '실패',
  skipped:   '건너뜀',
  stopped:   '중단',
};

const STATUS_STYLE: Record<string, string> = {
  running:   'text-sky-600 font-semibold',
  completed: 'text-emerald-600',
  failed:    'text-red-500',
  skipped:   'text-slate-400',
  stopped:   'text-slate-400',
  pending:   'text-slate-500',
  대기중:    'text-slate-500',
};

function fmtDuration(secs: number | null | undefined): string {
  if (secs == null) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}시간 ${m}분 ${s}초`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}

export default function QueuePanel() {
  const { status, batch_mode, batch_total, batch_done, batch_queue_signal } = useTrainingStore();
  const { preprocessingConfig, modelConfig } = useConfigStore();
  const hasConfig = !!(preprocessingConfig && modelConfig);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchPending, setBatchPending] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function loadQueue() {
    try {
      const res = await getQueue();
      setQueue(res.data);
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError((e as { message?: string })?.message ?? '큐 로드 실패');
    }
  }

  useEffect(() => { loadQueue(); }, [batch_queue_signal]);

  const isRunning = status === 'running' || status === 'paused';

  // #02: 배치 중에는 완료된 항목도 숨기지 않음
  const visibleQueue = batch_mode
    ? queue
    : queue.filter((item) => item.status !== 'completed');

  const pendingCount = queue.filter((item) => item.status === 'pending').length;

  useEffect(() => {
    if (isRunning) setBatchPending(false);
  }, [isRunning]);

  if (visibleQueue.length === 0 && !batch_mode) return null;

  async function handleBatchStart() {
    setBatchLoading(true);
    setBatchError(null);
    try {
      await startBatchTraining();
      setBatchPending(true);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setBatchError(typeof detail === 'string' ? detail : (e as { message?: string })?.message ?? '배치 시작 실패');
    } finally { setBatchLoading(false); }
  }

  async function handleSkip() {
    setBatchError(null);
    try { await skipBatchItem(); }
    catch (e: unknown) { setBatchError((e as { message?: string })?.message ?? '건너뜀 실패'); }
  }

  async function handleBatchStop() {
    setBatchError(null);
    try { await stopBatchTraining(); }
    catch (e: unknown) { setBatchError((e as { message?: string })?.message ?? '중단 실패'); }
  }

  // #01: 대기열 항목 삭제 (running 제외)
  async function handleDelete(id: string) {
    setDeleteError(null);
    try {
      await deleteQueueItem(id);
      setConfirmDeleteId(null);
      await loadQueue();
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setDeleteError(typeof detail === 'string' ? detail : (e as { message?: string })?.message ?? '삭제 실패');
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
              disabled={batchLoading || batchPending || !hasConfig}
              title={!hasConfig ? '전처리/모델 설정을 먼저 저장해 주세요' : undefined}
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
      {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}

      {visibleQueue.length > 0 ? (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-y-auto max-h-[260px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="border-b border-slate-200">
                  {['#', '실험명', 'Set ID', '상태', '소요시간', ''].map((h) => (
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
                    {/* #03: 소요시간 */}
                    <td className="px-3 py-2 text-slate-400">
                      {item.status === 'completed' ? fmtDuration(item.duration_seconds) : '—'}
                    </td>
                    {/* #01: 삭제 버튼 (실행 중 제외) */}
                    <td className="px-3 py-2">
                      {item.status !== 'running' && (
                        confirmDeleteId === item.id ? (
                          <span className="flex gap-1.5 items-center">
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:underline cursor-pointer text-xs"
                            >확인</button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-slate-400 hover:underline cursor-pointer text-xs"
                            >취소</button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="text-slate-400 hover:text-red-500 cursor-pointer transition-colors"
                          >삭제</button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400">대기 중인 항목이 없습니다.</p>
      )}
    </div>
  );
}
