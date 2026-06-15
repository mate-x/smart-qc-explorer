import { useState, useRef, useEffect } from 'react';
import { useTrainingStore } from '../../store/trainingStore';
import { useQueueStore } from '../../store/queueStore';
import { useQueuePanelColumnStore } from '../../store/queuePanelColumnStore';
import { startBatchTraining, stopBatchTraining, skipBatchItem } from '../../api/trainingApi';

const EFF_COL_COUNT = 18;
const PC_COL_COUNT = 6;

const STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  running: '실행 중',
  completed: '완료',
  failed: '실패',
  skipped: '건너뜀',
  stopped: '중단',
};

const STATUS_STYLE: Record<string, string> = {
  running:   'text-sky-600 font-semibold',
  completed: 'text-emerald-600',
  failed: 'text-red-500',
  skipped: 'text-slate-400',
  stopped: 'text-slate-400',
  pending: 'text-slate-500',
};

const thCls = 'px-2 py-2 text-left text-xs font-semibold text-slate-500 whitespace-nowrap bg-slate-50 border-b border-slate-200';
const thGroupCls = `${thCls} cursor-pointer select-none hover:bg-slate-100 transition-colors border-l border-slate-200`;
const tdCls = 'px-2 py-2 text-slate-600 whitespace-nowrap';
const tdDashCls = 'px-2 py-2 text-slate-300 whitespace-nowrap';
const fmtLR = (v: number) => String(v);

export default function QueuePanel() {
  const { status, batch_mode, batch_total, batch_done, batch_queue_signal, setCurrentModelType } = useTrainingStore();
  const { loading, loadError, items, loadQueue, deleteItem } = useQueueStore();
  const { commonOpen, efficientadOpen, patchcoreOpen,
          setCommonOpen, setEfficientadOpen, setPatchcoreOpen } = useQueuePanelColumnStore();

  const [batchLoading, setBatchLoading] = useState(false);
  const [batchPending, setBatchPending] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const groupHeaderRowRef = useRef<HTMLTableRowElement>(null);
  const [groupHeaderHeight, setGroupHeaderHeight] = useState(36);

  useEffect(() => {
    loadQueue();
  }, [batch_queue_signal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = groupHeaderRowRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setGroupHeaderHeight(el.getBoundingClientRect().height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isRunning = status === 'running' || status === 'paused';

  // B안 필터링: set_id가 있는 항목은 동일 set 내 pending/running이 하나라도 있으면 전체 표시,
  // 없으면 전체 숨김. set_id가 없는 항목은 pending/running인 것만 표시.
  const activeSetIds = new Set(
    items
      .filter((item) => item.status === 'pending' || item.status === 'running')
      .map((item) => item.set_id)
      .filter((id): id is string => !!id),
  );
  const filteredItems = items.filter((item) =>
    item.set_id ? activeSetIds.has(item.set_id) : item.status === 'pending' || item.status === 'running',
  );

  const pendingCount = filteredItems.filter((item) => item.status === 'pending').length;

  useEffect(() => {
    if (isRunning) setBatchPending(false);
  }, [isRunning]);

  if (loading && items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-center min-h-[60px]">
        <span className="text-xs text-slate-400 animate-pulse">큐 로딩 중...</span>
      </div>
    );
  }

  if (filteredItems.length === 0) return null;

  async function handleDelete(id: string) {
    setDeleteError(null);
    try {
      await deleteItem(id);
    } catch (e: unknown) {
      setDeleteError((e as { message?: string })?.message ?? '삭제 실패');
    }
  }

  async function handleBatchStart() {
    setBatchLoading(true);
    setBatchError(null);
    try {
      const res = await startBatchTraining();
      setCurrentModelType(res.data.model_type ?? null);
      await loadQueue();
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
          <span className="ml-2 text-xs font-normal text-slate-400">({filteredItems.length}개)</span>
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
              {batchLoading ? '시작 중...' : batchPending ? '첫 항목 준비 중...' : pendingCount === 1 ? '▶ 학습 시작' : '▶▶ 일괄 학습 시작'}
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

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              {/* Row 1: 그룹 헤더 */}
              <tr ref={groupHeaderRowRef}>
                <th rowSpan={2} className={`sticky left-0 z-30 w-[2.5rem] ${thCls}`}>#</th>
                <th rowSpan={2} className={`sticky left-10 z-30 w-[8rem] border-r border-slate-200 ${thCls}`}>실험명</th>
                <th
                  colSpan={commonOpen ? 7 : 1}
                  className={thGroupCls}
                  onClick={() => setCommonOpen(!commonOpen)}
                >
                  {commonOpen ? '▾' : '▸'} [공통]
                </th>
                <th
                  colSpan={efficientadOpen ? EFF_COL_COUNT : 1}
                  className={thGroupCls}
                  onClick={() => setEfficientadOpen(!efficientadOpen)}
                >
                  {efficientadOpen ? '▾' : '▸'} [EfficientAD]
                </th>
                <th
                  colSpan={patchcoreOpen ? PC_COL_COUNT : 1}
                  className={thGroupCls}
                  onClick={() => setPatchcoreOpen(!patchcoreOpen)}
                >
                  {patchcoreOpen ? '▾' : '▸'} [PatchCore]
                </th>
                <th rowSpan={2} className={`w-[5rem] ${thCls}`}>Set ID</th>
                <th rowSpan={2} className={`sticky right-12 z-30 w-[4rem] border-l border-slate-200 ${thCls}`}>상태</th>
                <th rowSpan={2} className={`sticky right-0 z-30 w-[3rem] ${thCls}`}></th>
              </tr>

              {/* Row 2: 컬럼 헤더 */}
              <tr style={{ top: groupHeaderHeight }}>
                {commonOpen ? (
                  <>
                    <th className={`sticky z-10 ${thCls}`}>전처리</th>
                    <th className={`sticky z-10 ${thCls}`}>배경분리</th>
                    <th className={`sticky z-10 ${thCls}`}>이미지크기</th>
                    <th className={`sticky z-10 ${thCls}`}>배치크기</th>
                    <th className={`sticky z-10 ${thCls}`}>랜덤시드</th>
                    <th className={`sticky z-10 ${thCls}`}>Threshold방식</th>
                    <th className={`sticky z-10 ${thCls}`}>Threshold값</th>
                  </>
                ) : (
                  <th />
                )}
                {efficientadOpen ? (
                  <>
                    <th className={`sticky z-10 ${thCls}`}>모델크기</th>
                    <th className={`sticky z-10 ${thCls}`}>Train Steps</th>
                    <th className={`sticky z-10 ${thCls}`}>Optimizer</th>
                    <th className={`sticky z-10 ${thCls}`}>Scheduler</th>
                    <th className={`sticky z-10 ${thCls}`}>LR</th>
                    <th className={`sticky z-10 ${thCls}`}>Weight Decay</th>
                    <th className={`sticky z-10 ${thCls}`}>Out Channels</th>
                    <th className={`sticky z-10 ${thCls}`}>Padding</th>
                    <th className={`sticky z-10 ${thCls}`}>AE Loss Weight</th>
                    <th className={`sticky z-10 ${thCls}`}>AE LR</th>
                    <th className={`sticky z-10 ${thCls}`}>AE Weight Decay</th>
                    <th className={`sticky z-10 ${thCls}`}>LR Decay Steps</th>
                    <th className={`sticky z-10 ${thCls}`}>LR Decay Factor</th>
                    <th className={`sticky z-10 ${thCls}`}>ImageNet Penalty</th>
                    <th className={`sticky z-10 ${thCls}`}>Penalty Batch</th>
                    <th className={`sticky z-10 ${thCls}`}>Early Stopping</th>
                    <th className={`sticky z-10 ${thCls}`}>Patience</th>
                    <th className={`sticky z-10 ${thCls}`}>Min Delta</th>
                  </>
                ) : (
                  <th />
                )}
                {patchcoreOpen ? (
                  <>
                    <th className={`sticky z-10 ${thCls}`}>백본</th>
                    <th className={`sticky z-10 ${thCls}`}>Coreset비율</th>
                    <th className={`sticky z-10 ${thCls}`}>커널크기</th>
                    <th className={`sticky z-10 ${thCls}`}>Max Train</th>
                    <th className={`sticky z-10 ${thCls}`}>kNN</th>
                    <th className={`sticky z-10 ${thCls}`}>Top-k비율</th>
                  </>
                ) : (
                  <th />
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item, idx) => {
                const pre = item.preprocessing_config;
                const mc = item.model_config;
                const stickyBg = 'bg-white group-hover:bg-slate-50';

                return (
                  <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                    <td className={`sticky left-0 z-[1] w-[2.5rem] px-2 py-2 text-slate-400 ${stickyBg}`}>
                      {idx + 1}
                    </td>
                    <td className={`sticky left-10 z-[1] w-[8rem] px-2 py-2 font-mono text-slate-700 border-r border-slate-200 ${stickyBg}`}>
                      <span className="truncate block">{item.name}</span>
                    </td>

                    {commonOpen ? (
                      <>
                        <td className={tdCls}>{pre.method}</td>
                        <td className={tdCls}>{pre.background_method}</td>
                        <td className={tdCls}>{pre.image_size}</td>
                        <td className={tdCls}>{mc.batch_size}</td>
                        <td className={tdCls}>{mc.random_seed}</td>
                        <td className={tdCls}>{mc.threshold_method}</td>
                        <td className={tdCls}>{mc.threshold_value}</td>
                      </>
                    ) : (
                      <td />
                    )}

                    {efficientadOpen ? (
                      mc.model_type === 'efficientad' ? (
                        <>
                          <td className={tdCls}>{mc.params.model_size}</td>
                          <td className={tdCls}>{mc.params.train_steps.toLocaleString()}</td>
                          <td className={tdCls}>{mc.params.optimizer}</td>
                          <td className={tdCls}>{mc.params.scheduler}</td>
                          <td className={tdCls}>{fmtLR(mc.params.learning_rate)}</td>
                          <td className={tdCls}>{fmtLR(mc.params.weight_decay)}</td>
                          <td className={tdCls}>{mc.params.out_channels}</td>
                          <td className={tdCls}>{String(mc.params.padding)}</td>
                          <td className={tdCls}>{mc.params.ae_loss_weight}</td>
                          <td className={tdCls}>{fmtLR(mc.params.autoencoder_lr)}</td>
                          <td className={tdCls}>{fmtLR(mc.params.autoencoder_weight_decay)}</td>
                          <td className={tdCls}>{mc.params.lr_decay_epochs.toLocaleString()}</td>
                          <td className={tdCls}>{mc.params.lr_decay_factor}</td>
                          <td className={tdCls}>{String(mc.params.use_imagenet_penalty)}</td>
                          <td className={tdCls}>
                            {mc.params.use_imagenet_penalty ? String(mc.params.penalty_batch_size) : '—'}
                          </td>
                          <td className={tdCls}>{String(mc.params.early_stopping)}</td>
                          <td className={tdCls}>
                            {mc.params.early_stopping ? String(mc.params.patience) : '—'}
                          </td>
                          <td className={tdCls}>
                            {mc.params.early_stopping ? String(mc.params.min_delta) : '—'}
                          </td>
                        </>
                      ) : (
                        <>{Array.from({ length: EFF_COL_COUNT }, (_, i) => (
                          <td key={i} className={tdDashCls}>—</td>
                        ))}</>
                      )
                    ) : (
                      <td />
                    )}

                    {patchcoreOpen ? (
                      mc.model_type === 'patchcore' ? (
                        <>
                          <td className={tdCls}>{mc.params.backbone}</td>
                          <td className={tdCls}>{mc.params.coreset_sampling_ratio}</td>
                          <td className={tdCls}>{mc.params.neighbourhood_kernel_size}</td>
                          <td className={tdCls}>{mc.params.max_train}</td>
                          <td className={tdCls}>{mc.params.knn}</td>
                          <td className={tdCls}>{mc.params.top_k_ratio}</td>
                        </>
                      ) : (
                        <>{Array.from({ length: PC_COL_COUNT }, (_, i) => (
                          <td key={i} className={tdDashCls}>—</td>
                        ))}</>
                      )
                    ) : (
                      <td />
                    )}

                    <td className="px-2 py-2 text-slate-500 whitespace-nowrap">{item.set_id ?? '—'}</td>

                    <td className={`sticky right-12 z-[1] w-[4rem] px-2 py-2 whitespace-nowrap border-l border-slate-200 ${STATUS_STYLE[item.status] ?? 'text-slate-500'} ${stickyBg}`}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </td>

                    <td className={`sticky right-0 z-[1] px-2 py-2 text-right ${stickyBg}`}>
                      {confirmDeleteId === item.id ? (
                        <span className="flex gap-1.5 items-center justify-end">
                          <button
                            onClick={() => { handleDelete(item.id); setConfirmDeleteId(null); }}
                            className="text-red-600 hover:text-red-500 font-medium cursor-pointer"
                          >
                            확인
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            취소
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(item.id)}
                          disabled={item.status === 'running'}
                          className="text-slate-300 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          삭제
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
