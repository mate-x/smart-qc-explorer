import { useState, useRef, useEffect } from 'react';
import { useLocalQueueStore } from '../../store/localQueueStore';
import { useTrainingStore } from '../../store/trainingStore';
import { useConfigStore } from '../../store/configStore';
import { useQueueColumnStore } from '../../store/queueColumnStore';
import { addToQueue } from '../../api/configApi';
import ConfirmModal from '../common/ConfirmModal';

const EFF_COL_COUNT = 18;
const PC_COL_COUNT = 6;
const PAGE_SIZE = 10;

const thCls = 'px-2 py-2 text-left text-xs font-semibold text-slate-500 whitespace-nowrap bg-slate-50 border-b border-slate-200';
const thGroupCls = `${thCls} cursor-pointer select-none hover:bg-slate-100 transition-colors border-l border-slate-200`;
const tdCls = 'px-2 py-2 text-slate-600 whitespace-nowrap';
const tdDashCls = 'px-2 py-2 text-slate-300 whitespace-nowrap';

export default function QueueSection() {
  const { localItems, deleteLocalItem, reorderLocalItem, clearLocalItems } = useLocalQueueStore();
  const { status, clearLastResult } = useTrainingStore();
  const { setConfigs } = useConfigStore();
  const { commonOpen, efficientadOpen, patchcoreOpen,
          setCommonOpen, setEfficientadOpen, setPatchcoreOpen } = useQueueColumnStore();

  const [page, setPage] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [expName, setExpName] = useState('');

  const groupHeaderRowRef = useRef<HTMLTableRowElement>(null);
  const [groupHeaderHeight, setGroupHeaderHeight] = useState(36);

  useEffect(() => {
    const el = groupHeaderRowRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setGroupHeaderHeight(el.getBoundingClientRect().height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  async function submitQueue() {
    if (localItems.length === 0) return;
    setConfirmLoading(true);
    setConfirmError(null);
    setConfirmModalOpen(false);

    setConfigs(localItems[0].preprocessing_config, localItems[0].model_config);

    const sharedSetId = 'SET_' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

    const snapshot = [...localItems];
    let successCount = 0;
    let errorMsg = '';
    let failed = false;

    for (const item of snapshot) {
      const effectiveSetId = item.set_id ?? sharedSetId;
      const effectiveName = expName.trim() || item.name || undefined;
      try {
        await addToQueue(item.preprocessing_config, item.model_config, effectiveSetId, effectiveName);
        successCount++;
      } catch (e: unknown) {
        const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
        errorMsg = typeof detail === 'string' ? detail : (e as { message?: string })?.message ?? '확정 실패';
        failed = true;
        break;
      }
    }

    if (!failed) {
      clearLocalItems();
      clearLastResult();
      setSelectedIndex(null);
      setExpName('');
    } else {
      for (let i = 0; i < successCount; i++) {
        deleteLocalItem(0);
      }
      setConfirmError(errorMsg);
    }

    setConfirmLoading(false);
  }

  function handleConfirmClick() {
    if (localItems.length === 0) return;
    if (status === 'idle') {
      submitQueue();
    } else {
      setConfirmModalOpen(true);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-800">
          학습 대기열
          <span className="ml-2 text-xs font-normal text-slate-400">({localItems.length}개)</span>
        </h3>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => {
            if (selectedIndex === null) return;
            const newIdx = selectedIndex - 1;
            reorderLocalItem(selectedIndex, 'up');
            setSelectedIndex(newIdx);
            if (newIdx < page * PAGE_SIZE) setPage(page - 1);
          }}
          disabled={selectedIndex === null || selectedIndex === 0}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >▲ 위로</button>
        <button
          type="button"
          onClick={() => {
            if (selectedIndex === null) return;
            const newIdx = selectedIndex + 1;
            reorderLocalItem(selectedIndex, 'down');
            setSelectedIndex(newIdx);
            if (newIdx >= (page + 1) * PAGE_SIZE) setPage(page + 1);
          }}
          disabled={selectedIndex === null || selectedIndex === localItems.length - 1}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >▼ 아래로</button>
        {selectedIndex !== null && (
          <span className="text-xs text-slate-400">{selectedIndex + 1}번 항목 선택됨</span>
        )}
      </div>

      {confirmError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{confirmError}</p>
      )}

      {/* 대기열 테이블 */}
      {localItems.length > 0 ? (
        <>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  {/* Row 1: 그룹 헤더 */}
                  <tr ref={groupHeaderRowRef}>
                    <th rowSpan={2} className={`sticky left-0 z-30 w-[2.5rem] ${thCls}`}>#</th>
                    <th rowSpan={2} className={`sticky left-10 z-30 w-[6rem] ${thCls}`}>모델</th>
                    <th rowSpan={2} className={`sticky left-[136px] z-30 w-[7rem] ${thCls}`}>Set ID</th>
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
                    <th rowSpan={2} className={`sticky right-12 z-30 w-[3rem] ${thCls}`}>상세</th>
                    <th rowSpan={2} className={`sticky right-0 z-30 w-[3rem] ${thCls}`}>삭제</th>
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
                  {localItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((item, localIdx) => {
                    const globalIdx = page * PAGE_SIZE + localIdx;
                    const pre = item.preprocessing_config;
                    const mc = item.model_config;
                    const isSelected = selectedIndex === globalIdx;
                    const stickyBg = isSelected ? 'bg-sky-50' : 'bg-white group-hover:bg-slate-50';

                    return (
                      <tr
                        key={globalIdx}
                        className={`group transition-colors ${isSelected ? 'bg-sky-50' : 'hover:bg-slate-50'}`}
                      >
                        {/* 고정 열 */}
                        <td className={`sticky left-0 z-[1] w-[2.5rem] px-2 py-2 text-slate-400 ${stickyBg}`}>
                          <span className="truncate block">{globalIdx + 1}</span>
                        </td>
                        <td className={`sticky left-10 z-[1] w-[6rem] px-2 py-2 font-mono text-slate-700 ${stickyBg}`}>
                          <span className="truncate block">{mc.model_type}</span>
                        </td>
                        <td className={`sticky left-[136px] z-[1] w-[7rem] px-2 py-2 text-slate-500 ${stickyBg}`}>
                          <span className="truncate block">{item.set_id ?? '—'}</span>
                        </td>

                        {/* 공통 그룹 */}
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

                        {/* EfficientAD 그룹 */}
                        {efficientadOpen ? (
                          mc.model_type === 'efficientad' ? (
                            <>
                              <td className={tdCls}>{mc.params.model_size}</td>
                              <td className={tdCls}>{mc.params.train_steps.toLocaleString()}</td>
                              <td className={tdCls}>{mc.params.optimizer}</td>
                              <td className={tdCls}>{mc.params.scheduler}</td>
                              <td className={tdCls}>{mc.params.learning_rate.toExponential(2)}</td>
                              <td className={tdCls}>{mc.params.weight_decay.toExponential(2)}</td>
                              <td className={tdCls}>{mc.params.out_channels}</td>
                              <td className={tdCls}>{String(mc.params.padding)}</td>
                              <td className={tdCls}>{mc.params.ae_loss_weight}</td>
                              <td className={tdCls}>{mc.params.autoencoder_lr.toExponential(2)}</td>
                              <td className={tdCls}>{mc.params.autoencoder_weight_decay.toExponential(2)}</td>
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

                        {/* PatchCore 그룹 */}
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

                        {/* 상세 버튼 열 */}
                        <td
                          className={`sticky right-12 z-[1] px-2 py-2 ${stickyBg}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedIndex((prev) => (prev === globalIdx ? null : globalIdx))}
                            className={`text-xs transition-colors cursor-pointer ${isSelected ? 'text-sky-600 font-medium' : 'text-slate-400 hover:text-sky-500'}`}
                          >상세</button>
                        </td>

                        {/* 삭제 열 (확인 없이 즉시 삭제) */}
                        <td
                          className={`sticky right-0 z-[1] px-2 py-2 ${stickyBg}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              deleteLocalItem(globalIdx);
                              if (selectedIndex === globalIdx) setSelectedIndex(null);
                              else if (selectedIndex !== null && selectedIndex > globalIdx)
                                setSelectedIndex(selectedIndex - 1);
                              const newLen = localItems.length - 1;
                              const newTotal = Math.ceil(newLen / PAGE_SIZE);
                              if (newTotal > 0 && page >= newTotal) setPage(newTotal - 1);
                            }}
                            className="text-slate-400 hover:text-red-500 cursor-pointer transition-colors text-xs"
                          >삭제</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 페이지네이션 */}
          {localItems.length > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >이전</button>
              <span className="text-xs text-slate-500">
                {page + 1} / {Math.ceil(localItems.length / PAGE_SIZE)}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(Math.ceil(localItems.length / PAGE_SIZE) - 1, p + 1))}
                disabled={page >= Math.ceil(localItems.length / PAGE_SIZE) - 1}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >다음</button>
            </div>
          )}

          {/* 실험명 입력 + 확정 버튼 */}
          <div className="flex items-center gap-2 justify-end">
            <input
              type="text"
              value={expName}
              onChange={(e) => setExpName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !confirmLoading && handleConfirmClick()}
              placeholder="실험명 (비워두면 자동 생성)"
              className="w-64 border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-shadow"
            />
            <button
              type="button"
              onClick={handleConfirmClick}
              disabled={confirmLoading}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
            >
              {confirmLoading ? '확정 중...' : '확정'}
            </button>
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-400">대기 중인 항목이 없습니다.</p>
      )}

      {/* 선택 항목 상세 패널 */}
      {selectedIndex !== null && localItems[selectedIndex] && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-800">항목 {selectedIndex + 1} 상세 설정</span>
            <button
              type="button"
              onClick={() => setSelectedIndex(null)}
              className="text-xs text-sky-400 hover:text-sky-700 cursor-pointer"
            >✕</button>
          </div>
          <pre className="text-[11px] text-slate-700 bg-white border border-sky-100 rounded-lg p-3 overflow-auto max-h-64 leading-5">
            {JSON.stringify(
              {
                preprocessing: localItems[selectedIndex].preprocessing_config,
                model: localItems[selectedIndex].model_config,
              },
              null,
              2,
            )}
          </pre>
        </div>
      )}

      {confirmModalOpen && (
        <ConfirmModal
          message="진행 중인 학습이 있습니다. 확정하시겠습니까?"
          confirmLabel="확정"
          cancelLabel="취소"
          onConfirm={submitQueue}
          onCancel={() => setConfirmModalOpen(false)}
        />
      )}
    </div>
  );
}
