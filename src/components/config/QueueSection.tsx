import { useState, useEffect } from 'react';
import type { PreprocessingConfig, ModelConfig, QueueItem } from '../../types/config';
import { getQueue, addToQueue, deleteQueueItem } from '../../api/configApi';
import { useTrainingStore } from '../../store/trainingStore';

interface Props {
  preprocessingConfig: PreprocessingConfig;
  modelConfig: ModelConfig;
}

type VarValues = Record<string, unknown[]>;

// ---------- Cartesian product 유틸 ----------

function generateCombinations<T extends object>(baseParams: T, variables: VarValues): T[] {
  const base = baseParams as Record<string, unknown>;
  const keys = Object.keys(variables).filter((k) => variables[k].length > 0);
  if (keys.length === 0) return [{ ...base }] as T[];
  let combos: Record<string, unknown>[] = [{ ...base }];
  for (const key of keys) {
    const next: Record<string, unknown>[] = [];
    for (const combo of combos) {
      for (const val of variables[key]) {
        next.push({ ...combo, [key]: val });
      }
    }
    combos = next;
  }
  return combos as T[];
}

function parseNumList(s: string): number[] {
  return s.split(',').map((x) => parseFloat(x.trim())).filter((n) => !isNaN(n));
}

const EFF_VARS = [
  { key: 'model_size', label: 'Model Size', type: 'enum', options: ['small', 'medium'] },
  { key: 'train_steps', label: 'Train Steps', type: 'number_list', hint: '예: 30000,70000' },
  { key: 'optimizer', label: 'Optimizer', type: 'enum', options: ['adam', 'adamw', 'sgd'] },
  { key: 'learning_rate', label: 'Learning Rate', type: 'number_list', hint: '예: 0.0001,0.001' },
] as const;

const PC_VARS = [
  { key: 'backbone', label: 'Backbone', type: 'enum', options: ['resnet18', 'resnet50', 'wide_resnet50_2'] },
  { key: 'coreset_sampling_ratio', label: 'Coreset Ratio', type: 'number_list', hint: '예: 0.05,0.1' },
] as const;

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-slate-500',
  running: 'text-sky-600 font-semibold',
  completed: 'text-emerald-600',
  failed: 'text-red-500',
  skipped: 'text-slate-400',
};

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-shadow';

// ---------- 컴포넌트 ----------

export default function QueueSection({ preprocessingConfig, modelConfig }: Props) {
  const { clearLastResult } = useTrainingStore();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // 자동 실험 설계
  const [batchOpen, setBatchOpen] = useState(false);
  const [setId, setSetId] = useState('');
  const [enumSelections, setEnumSelections] = useState<Record<string, string[]>>({});
  const [numInputs, setNumInputs] = useState<Record<string, string>>({});
  const [batchAddLoading, setBatchAddLoading] = useState(false);
  const [batchAddError, setBatchAddError] = useState<string | null>(null);
  const [batchPreview, setBatchPreview] = useState<number | null>(null);

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

  // 자동 실험 설계 변수 목록
  const varDefs = modelConfig.model_type === 'efficientad' ? EFF_VARS : PC_VARS;

  function buildVariables(): VarValues {
    const vars: VarValues = {};
    for (const vd of varDefs) {
      if (vd.type === 'enum') {
        const sel = enumSelections[vd.key] ?? [];
        if (sel.length > 0) vars[vd.key] = sel;
      } else {
        const parsed = parseNumList(numInputs[vd.key] ?? '');
        if (parsed.length > 0) vars[vd.key] = parsed;
      }
    }
    return vars;
  }

  function updateBatchPreview() {
    const vars = buildVariables();
    const combos = generateCombinations(modelConfig.params, vars);
    setBatchPreview(combos.length);
  }

  async function handleBatchAdd() {
    const vars = buildVariables();
    if (Object.keys(vars).length === 0) {
      setBatchAddError('변경할 파라미터 값을 하나 이상 선택해 주세요.');
      return;
    }
    const combos = generateCombinations(modelConfig.params, vars);
    const sid = setId.trim() || undefined;

    setBatchAddLoading(true);
    setBatchAddError(null);
    try {
      for (const params of combos) {
        await addToQueue(preprocessingConfig, { ...modelConfig, params }, sid);
      }
      await loadQueue();
      clearLastResult();
      setBatchOpen(false);
      setEnumSelections({});
      setNumInputs({});
      setSetId('');
      setBatchPreview(null);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setBatchAddError(typeof detail === 'string' ? detail : (e as { message?: string })?.message ?? '일괄 추가 실패');
    } finally {
      setBatchAddLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-slate-800">학습 대기열</h3>

      {loadError && <p className="text-xs text-red-600">{loadError}</p>}
      {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}

      {/* 큐 테이블 */}
      {queue.filter((i) => i.status !== 'completed').length > 0 ? (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['#', '실험명', 'Set ID', '상태', ''].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queue.filter((i) => i.status !== 'completed').map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
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
      ) : (
        <p className="text-xs text-slate-400">대기 중인 항목이 없습니다.</p>
      )}

      {/* 현재 설정 추가 */}
      <div className="flex gap-2 items-center">
        <button type="button" onClick={handleAdd} disabled={addLoading}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors cursor-pointer">
          {addLoading ? '추가 중...' : '+ 현재 설정 큐에 추가'}
        </button>
      </div>
      {addError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>
      )}

      {/* 자동 실험 설계 */}
      <div>
        <button type="button"
          onClick={() => setBatchOpen((o) => !o)}
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors cursor-pointer">
          <span>{batchOpen ? '▾' : '▸'}</span>
          자동 실험 설계 (카르테시안 곱)
        </button>

        {batchOpen && (
          <div className="mt-3 flex flex-col gap-3 pl-3 border-l-2 border-slate-100">
            <p className="text-xs text-slate-500">
              변경할 파라미터 값을 선택하면 모든 조합이 큐에 추가됩니다.
            </p>

            {varDefs.map((vd) => (
              <div key={vd.key} className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-500">{vd.label}</label>
                {vd.type === 'enum' ? (
                  <div className="flex gap-3 flex-wrap">
                    {vd.options.map((opt) => {
                      const sel = enumSelections[vd.key] ?? [];
                      const checked = sel.includes(opt);
                      return (
                        <label key={opt} className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input type="checkbox" checked={checked}
                            onChange={() => {
                              const next = checked ? sel.filter((s) => s !== opt) : [...sel, opt];
                              setEnumSelections((prev) => ({ ...prev, [vd.key]: next }));
                              setBatchPreview(null);
                            }}
                            className="cursor-pointer accent-sky-600" />
                          <span className="text-slate-700">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <input type="text"
                    value={numInputs[vd.key] ?? ''}
                    placeholder={'hint' in vd ? vd.hint : ''}
                    onChange={(e) => {
                      setNumInputs((prev) => ({ ...prev, [vd.key]: e.target.value }));
                      setBatchPreview(null);
                    }}
                    className={inputCls} />
                )}
              </div>
            ))}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500">Set ID</label>
              <input type="text" value={setId}
                onChange={(e) => setSetId(e.target.value)}
                placeholder="예: batch_001 (Tab4 그룹 비교용)"
                className={inputCls} />
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              <button type="button" onClick={updateBatchPreview}
                className="px-3 py-1.5 border border-slate-200 text-xs text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                조합 미리보기
              </button>
              {batchPreview !== null && (
                <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                  → {batchPreview}개 조합
                </span>
              )}
              <button type="button" onClick={handleBatchAdd} disabled={batchAddLoading}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg disabled:opacity-40 transition-colors cursor-pointer">
                {batchAddLoading ? '추가 중...' : '큐에 전부 추가'}
              </button>
            </div>
            {batchAddError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {batchAddError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
