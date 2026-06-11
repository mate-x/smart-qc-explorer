import { useState } from 'react';
import { useLocalQueueStore } from '../../store/localQueueStore';
import { useTrainingStore } from '../../store/trainingStore';
import { useConfigStore } from '../../store/configStore';
import { addToQueue } from '../../api/configApi';
import ConfirmModal from '../common/ConfirmModal';

export default function QueueSection() {
  const { localItems, deleteLocalItem, reorderLocalItem, clearLocalItems } = useLocalQueueStore();
  const { status, clearLastResult } = useTrainingStore();
  const { setConfigs } = useConfigStore();

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  async function submitQueue() {
    if (localItems.length === 0) return;
    setConfirmLoading(true);
    setConfirmError(null);
    setConfirmModalOpen(false);

    setConfigs(localItems[0].preprocessing_config, localItems[0].model_config);

    const snapshot = [...localItems];
    let successCount = 0;
    let errorMsg = '';
    let failed = false;

    for (const item of snapshot) {
      try {
        await addToQueue(item.preprocessing_config, item.model_config, item.set_id);
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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">
          학습 대기열
          <span className="ml-2 text-xs font-normal text-slate-400">({localItems.length}개)</span>
        </h3>
        <button
          type="button"
          onClick={handleConfirmClick}
          disabled={localItems.length === 0 || confirmLoading}
          className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
        >
          {confirmLoading ? '확정 중...' : '확정'}
        </button>
      </div>

      {confirmError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{confirmError}</p>
      )}

      {/* 대기열 테이블 */}
      {localItems.length > 0 ? (
        <>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['#', '모델', 'Set ID', ''].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {localItems.map((item, idx) => (
                  <tr
                    key={idx}
                    onClick={() => setSelectedIndex((prev) => (prev === idx ? null : idx))}
                    className={`transition-colors cursor-pointer ${selectedIndex === idx ? 'bg-sky-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2 font-mono text-slate-700">{item.model_config.model_type}</td>
                    <td className="px-3 py-2 text-slate-500">{item.set_id ?? '—'}</td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      {confirmDeleteIndex === idx ? (
                        <span className="flex gap-1.5 items-center">
                          <button
                            type="button"
                            onClick={() => {
                              deleteLocalItem(idx);
                              setConfirmDeleteIndex(null);
                              if (selectedIndex === idx) setSelectedIndex(null);
                              else if (selectedIndex !== null && selectedIndex > idx)
                                setSelectedIndex(selectedIndex - 1);
                            }}
                            className="text-red-600 hover:underline cursor-pointer text-xs"
                          >확인</button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteIndex(null)}
                            className="text-slate-400 hover:underline cursor-pointer text-xs"
                          >취소</button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteIndex(idx)}
                          className="text-slate-400 hover:text-red-500 cursor-pointer transition-colors"
                        >삭제</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 순서 변경 버튼 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (selectedIndex === null) return;
                reorderLocalItem(selectedIndex, 'up');
                setSelectedIndex(selectedIndex - 1);
              }}
              disabled={selectedIndex === null || selectedIndex === 0}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >▲ 위로</button>
            <button
              type="button"
              onClick={() => {
                if (selectedIndex === null) return;
                reorderLocalItem(selectedIndex, 'down');
                setSelectedIndex(selectedIndex + 1);
              }}
              disabled={selectedIndex === null || selectedIndex === localItems.length - 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >▼ 아래로</button>
            {selectedIndex !== null && (
              <span className="text-xs text-slate-400">{selectedIndex + 1}번 항목 선택됨</span>
            )}
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
