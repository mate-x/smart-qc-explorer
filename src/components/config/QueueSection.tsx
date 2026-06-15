import { useState, useEffect } from 'react';
import type { PreprocessingConfig, ModelConfig, QueueItem } from '../../types/config';
import { getQueue, addToQueue, deleteQueueItem, clearQueue, reorderQueueItem } from '../../api/configApi';
import { useTrainingStore } from '../../store/trainingStore';

interface Props {
  preprocessingConfig: PreprocessingConfig;
  modelConfig: ModelConfig;
  refreshTrigger?: number;
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-slate-500',
  running: 'text-sky-600 font-semibold',
  completed: 'text-emerald-600',
  failed: 'text-red-500',
  skipped: 'text-slate-400',
};


export default function QueueSection({ preprocessingConfig, modelConfig, refreshTrigger }: Props) {
  const { clearLastResult } = useTrainingStore();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reorderLoading, setReorderLoading] = useState(false);

  async function loadQueue() {
    try {
      const res = await getQueue();
      setQueue(res.data);
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError((e as { message?: string })?.message ?? '큐 로드 실패');
    }
  }

  useEffect(() => { loadQueue(); }, []);
  useEffect(() => { if (refreshTrigger) loadQueue(); }, [refreshTrigger]);

  async function handleClearAll() {
    setClearError(null);
    try {
      await clearQueue();
      setConfirmClearAll(false);
      await loadQueue();
    } catch (e: unknown) {
      setClearError((e as { message?: string })?.message ?? '전체 삭제 실패');
    }
  }

  async function handleAdd() {
    setAddLoading(true);
    setAddError(null);
    try {
      await addToQueue(preprocessingConfig, modelConfig);
      await loadQueue();
      clearLastResult();
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setAddError(typeof detail === 'string' ? detail : (e as { message?: string })?.message ?? '추가 실패');
    } finally {
      setAddLoading(false);
    }
  }

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

  async function handleReorder(direction: 'up' | 'down') {
    if (!selectedId || reorderLoading) return;
    setReorderLoading(true);
    try {
      await reorderQueueItem(selectedId, direction);
      await loadQueue();
    } catch { /* 경계 조건 등 — 버튼 비활성화로 대부분 방지됨 */ }
    finally { setReorderLoading(false); }
  }

  return (
    <div className="flex flex-col gap-4">
      {loadError && <p className="text-xs text-red-600">{loadError}</p>}
      {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
      {clearError && <p className="text-xs text-red-600">{clearError}</p>}

      {/* 큐 테이블 */}
      {queue.filter((i) => i.status !== 'completed').length > 0 ? (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-y-auto max-h-[260px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="border-b border-slate-200">
                {['#', '실험명', 'Set ID', '상태', ''].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queue.filter((i) => i.status !== 'completed').map((item, idx) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedId(prev => prev === item.id ? null : item.id)}
                  className={`transition-colors cursor-pointer ${selectedId === item.id ? 'bg-sky-50' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                  <td className="px-3 py-2 font-mono text-slate-700">{item.name}</td>
                  <td className="px-3 py-2 text-slate-500">{item.set_id ?? '—'}</td>
                  <td className={`px-3 py-2 ${STATUS_COLOR[item.status] ?? 'text-slate-500'}`}>
                    {item.status}
                  </td>
                  <td className="px-3 py-2">
                    {item.status === 'pending' && (
                      confirmDeleteId === item.id ? (
                        <span className="flex gap-1.5 items-center">
                          <button onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:underline cursor-pointer text-xs">확인</button>
                          <button onClick={() => setConfirmDeleteId(null)}
                            className="text-slate-400 hover:underline cursor-pointer text-xs">취소</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(item.id)}
                          className="text-slate-400 hover:text-red-500 cursor-pointer transition-colors">
                          삭제
                        </button>
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

      {/* 순서 변경 버튼 — pending 항목 선택 시에만 표시 */}
      {(() => {
        if (!selectedId) return null;
        const sel = queue.find(i => i.id === selectedId);
        if (!sel || sel.status !== 'pending') return null;
        const pendingItems = queue.filter(i => i.status === 'pending');
        const pendingIdx = pendingItems.findIndex(i => i.id === selectedId);
        return (
          <div className="flex gap-2 items-center">
            <span className="text-xs text-slate-500">순서 변경:</span>
            <button type="button" onClick={() => handleReorder('up')}
              disabled={pendingIdx <= 0 || reorderLoading}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="위로 이동">▲</button>
            <button type="button" onClick={() => handleReorder('down')}
              disabled={pendingIdx >= pendingItems.length - 1 || reorderLoading}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="아래로 이동">▼</button>
            {reorderLoading && <span className="text-xs text-slate-400">이동 중...</span>}
          </div>
        );
      })()}

      {/* 선택 항목 상세 패널 */}
      {selectedId && (() => {
        const item = queue.find(i => i.id === selectedId);
        if (!item) return null;
        return (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-800">{item.name} 상세 설정</span>
              <button
                onClick={() => setSelectedId(null)}
                className="text-xs text-sky-400 hover:text-sky-700 cursor-pointer"
              >✕</button>
            </div>
            <pre className="text-[11px] text-slate-700 bg-white border border-sky-100 rounded-lg p-3 overflow-auto max-h-64 leading-5">
              {JSON.stringify({ preprocessing: item.preprocessing_config, model: item.model_config }, null, 2)}
            </pre>
          </div>
        );
      })()}

      {/* 현재 설정 추가 + 전체 삭제 */}
      <div className="flex gap-2 items-center flex-wrap">
        <button type="button" onClick={handleAdd} disabled={addLoading}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors cursor-pointer">
          {addLoading ? '추가 중...' : '+ 현재 설정 큐에 추가'}
        </button>
        {queue.filter((i) => i.status !== 'running').length > 0 && (
          confirmClearAll ? (
            <span className="flex items-center gap-2">
              <span className="text-xs text-amber-700">전체 삭제 후 복구 불가 — 계속하시겠습니까?</span>
              <button type="button" onClick={handleClearAll}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer">확인</button>
              <button type="button" onClick={() => setConfirmClearAll(false)}
                className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs rounded-lg transition-colors cursor-pointer">취소</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmClearAll(true)}
              className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-500 text-xs font-medium rounded-lg transition-colors cursor-pointer">
              전체 삭제
            </button>
          )
        )}
      </div>
      {addError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>
      )}
    </div>
  );
}
