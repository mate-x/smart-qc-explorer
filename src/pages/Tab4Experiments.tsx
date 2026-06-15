import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExperiments, deleteExperiment, saveExperiment } from '../api/experimentsApi';
import { useExperimentsStore } from '../store/experimentsStore';
import type { Experiment, ExperimentMetrics } from '../types/experiments';
import { paramSummary, fmt } from '../components/tab4/experimentUtils';
import ConfusionMatrixChart from '../components/tab4/ConfusionMatrixChart';
import RocCurveChart from '../components/tab4/RocCurveChart';
import ScoreDistChart from '../components/tab4/ScoreDistChart';
import ComparisonSection from '../components/tab4/ComparisonSection';
import BatchComparisonSection from '../components/tab4/BatchComparisonSection';

// ---------- 헬퍼 함수 ----------

function computeTrainedThreshold(exp: Experiment): number | null {
  const scores = exp.metrics?.anomaly_scores;
  const labels = exp.metrics?.image_labels;
  if (!scores?.length || !labels?.length) return null;

  const method = exp.threshold_method ?? 'percentile';
  const value  = exp.threshold_value  ?? 95.0;

  if (method === 'absolute') return value;

  const normalScores = scores
    .filter((_, i) => labels[i] === 0)
    .sort((a, b) => a - b);
  if (normalScores.length === 0) return value;

  const idx = (value / 100) * (normalScores.length - 1);
  const lo  = Math.floor(idx);
  const hi  = Math.ceil(idx);
  if (lo === hi) return normalScores[lo];
  return normalScores[lo] + (idx - lo) * (normalScores[hi] - normalScores[lo]);
}

function recomputeMetrics(
  scores: number[],
  labels: number[],
  threshold: number,
  orig: ExperimentMetrics,
): ExperimentMetrics {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const n = Math.min(scores.length, labels.length);
  for (let i = 0; i < n; i++) {
    const pred = scores[i] >= threshold ? 1 : 0;
    if (pred === 1 && labels[i] === 1) tp++;
    else if (pred === 1 && labels[i] === 0) fp++;
    else if (pred === 0 && labels[i] === 0) tn++;
    else fn++;
  }
  const total     = tp + fp + tn + fn;
  const accuracy  = total > 0 ? (tp + tn) / total : 0;
  const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
  const recall    = (tp + fn) > 0 ? tp / (tp + fn) : 0;
  const f1  = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;
  const f2  = (4 * precision + recall) > 0 ? 5 * precision * recall / (4 * precision + recall) : 0;
  return {
    ...orig,
    accuracy,
    precision,
    recall,
    f1_score: f1,
    f2_score: f2,
    confusion_matrix: { tp, fp, tn, fn },
  };
}

// ---------- 컴포넌트 ----------

export default function Tab4Experiments() {
  const navigate = useNavigate();
  const { selectedExperimentId, setSelectedExperimentId } = useExperimentsStore();

  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [savePath, setSavePath] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Threshold 조정 상태
  const [adjustedThreshold, setAdjustedThreshold] = useState<number | null>(null);

  const selected  = experiments.find(e => e.experiment_id === selectedExperimentId) ?? null;
  const completed = experiments.filter(e => e.status === 'completed');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getExperiments();
      setExperiments(res.data);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? '실험 목록 로드 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // 실험 변경 시 threshold 초기화
  useEffect(() => {
    setAdjustedThreshold(null);
  }, [selectedExperimentId]);

  async function handleDelete() {
    if (!selected) return;
    setDeleteError(null);
    try {
      await deleteExperiment(selected.experiment_id);
      setSelectedExperimentId(null);
      setConfirmDelete(false);
      load();
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setDeleteError(typeof detail === 'string' ? detail : (e as { message?: string })?.message ?? '삭제 실패');
    }
  }

  async function handleSave() {
    if (!selected || !savePath.trim()) return;
    setSaveLoading(true);
    setSaveResult(null);
    try {
      const res = await saveExperiment(selected.experiment_id, savePath.trim());
      const { saved_path, size_mb, warning } = res.data;
      setSaveResult({ ok: true, msg: `저장 완료 — ${saved_path} (${size_mb} MB)${warning ? `\n⚠️ ${warning}` : ''}` });
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setSaveResult({ ok: false, msg: typeof detail === 'string' ? detail : (e as { message?: string })?.message ?? '저장 실패' });
    } finally {
      setSaveLoading(false);
    }
  }

  useEffect(() => {
    if (selected?.model_path) setSavePath(selected.model_path);
    else if (selected) setSavePath(`./models/${selected.experiment_id}/`);
    setSaveResult(null);
  }, [selected?.experiment_id]);

  // ---------- Threshold 파생값 ----------

  const initialThreshold = useMemo(
    () => (selected ? computeTrainedThreshold(selected) : null),
    [selected?.experiment_id],
  );

  const effectiveThreshold = adjustedThreshold ?? initialThreshold;

  const scoreMin = useMemo(() => {
    const s = selected?.metrics?.anomaly_scores;
    return s?.length ? Math.min(...s) : 0;
  }, [selected?.experiment_id]);

  const scoreMax = useMemo(() => {
    const s = selected?.metrics?.anomaly_scores;
    return s?.length ? Math.max(...s) : 1;
  }, [selected?.experiment_id]);

  const adjustedMetrics = useMemo<ExperimentMetrics | null>(() => {
    if (!selected?.metrics || effectiveThreshold == null) return selected?.metrics ?? null;
    const scores = selected.metrics.anomaly_scores;
    const labels = selected.metrics.image_labels;
    if (!scores?.length || !labels?.length) return selected.metrics;
    return recomputeMetrics(scores, labels, effectiveThreshold, selected.metrics);
  }, [selected?.experiment_id, effectiveThreshold]);

  const isThresholdModified =
    adjustedThreshold !== null &&
    initialThreshold !== null &&
    Math.abs(adjustedThreshold - initialThreshold) > 1e-9;

  // ---------- 렌더링 ----------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className="text-sm text-slate-400 animate-pulse">실험 목록 로딩 중...</span>
      </div>
    );
  }
  if (error) return <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-600">{error}</div>;
  if (experiments.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 flex flex-col items-center gap-3">
        <p className="text-sm font-medium text-slate-500">실험 기록이 없습니다</p>
        <p className="text-xs text-slate-400">학습 탭에서 학습을 실행하면 여기에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 실험 목록 테이블 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">실험 목록</h2>
          <div className="flex items-center gap-2">
            {selected && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-700">삭제 후 복구 불가 — 계속하시겠습니까?</span>
                  <button onClick={handleDelete} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer">확인</button>
                  <button onClick={() => { setConfirmDelete(false); setDeleteError(null); }} className="px-3 py-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs rounded-lg transition-colors cursor-pointer">취소</button>
                  {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-600 text-xs font-medium rounded-lg transition-colors cursor-pointer">
                  삭제
                </button>
              )
            )}
          </div>
        </div>
        <div className="overflow-auto max-h-[300px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="border-b border-slate-200">
                {['실험명', '제품', '모델', '파라미터', 'Accuracy', 'Precision', 'Recall', 'F1', 'F2', 'AUC', '실행 시각', '상태'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {experiments.map(e => {
                const isSelected = e.experiment_id === selectedExperimentId;
                const isDimmed = e.status === '중단';
                const m = e.metrics;
                const isCompleted = e.status === 'completed';
                return (
                  <tr
                    key={e.experiment_id}
                    onClick={() => setSelectedExperimentId(isSelected ? null : e.experiment_id)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-sky-50' : 'hover:bg-slate-50'} ${isDimmed ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{e.name}</td>
                    <td className="px-4 py-3 text-slate-500">{e.product_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{e.model_type}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{paramSummary(e)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{isCompleted ? fmt(m?.accuracy) : '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{isCompleted ? fmt(m?.precision) : '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{isCompleted ? fmt(m?.recall) : '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{isCompleted ? fmt(m?.f1_score) : '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{isCompleted ? fmt(m?.f2_score) : '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">{isCompleted ? fmt(m?.auc) : '—'}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{e.created_at.slice(0, 19).replace('T', ' ')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        e.status === 'completed' ? 'bg-emerald-100 text-emerald-700'
                        : e.status === '중단' ? 'bg-slate-100 text-slate-500'
                        : 'bg-slate-100 text-slate-500'
                      }`}>
                        {e.status === 'completed' && e.early_stopped ? '완료 (조기종료)' : e.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 상세 결과 */}
      {selected?.status === 'completed' && selected.metrics && adjustedMetrics && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6">
          <h3 className="text-sm font-semibold text-slate-800">상세 결과 — {selected.name}</h3>

          {/* Threshold 조정 슬라이더 */}
          {initialThreshold !== null && (selected.metrics.anomaly_scores?.length ?? 0) > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Threshold 조정</span>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>
                    학습 시: <span className="font-mono text-slate-700">{initialThreshold.toFixed(4)}</span>
                    <span className="ml-1 text-slate-400">
                      ({selected.threshold_method === 'absolute'
                        ? '절대값'
                        : `${selected.threshold_value ?? 95}%ile`})
                    </span>
                  </span>
                  {isThresholdModified && (
                    <button
                      onClick={() => setAdjustedThreshold(null)}
                      className="text-sky-600 hover:underline cursor-pointer"
                    >
                      초기화
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-slate-400 w-16">{scoreMin.toFixed(4)}</span>
                <input
                  type="range"
                  min={scoreMin}
                  max={scoreMax}
                  step={(scoreMax - scoreMin) / 10000 || 0.0001}
                  value={effectiveThreshold ?? initialThreshold}
                  onChange={e => setAdjustedThreshold(parseFloat(e.target.value))}
                  className="flex-1 accent-sky-500 cursor-pointer"
                />
                <span className="text-[11px] font-mono text-slate-400 w-16 text-right">{scoreMax.toFixed(4)}</span>
              </div>
              <div className="text-center">
                <span className="text-base font-bold font-mono text-slate-800">
                  {(effectiveThreshold ?? initialThreshold).toFixed(4)}
                </span>
                {isThresholdModified && (
                  <span className="ml-2 text-xs text-amber-600 font-medium">수정됨</span>
                )}
              </div>
            </div>
          )}

          {/* 지표 카드 (6개: Accuracy Precision Recall F1 F2 + AUC 고정) */}
          <div className="grid grid-cols-6 gap-3">
            {[
              { label: 'Accuracy',  value: adjustedMetrics.accuracy,  fixed: false },
              { label: 'Precision', value: adjustedMetrics.precision,  fixed: false },
              { label: 'Recall',    value: adjustedMetrics.recall,     fixed: false },
              { label: 'F1',        value: adjustedMetrics.f1_score,   fixed: false },
              { label: 'F2',        value: adjustedMetrics.f2_score,   fixed: false },
              { label: 'AUC',       value: selected.metrics.auc,       fixed: true  },
            ].map(({ label, value, fixed }) => (
              <div
                key={label}
                className={`border rounded-xl p-3 text-center ${
                  fixed ? 'bg-slate-50 border-slate-200' : 'bg-sky-50 border-sky-100'
                }`}
              >
                <p className="text-[11px] font-medium text-slate-500 mb-1">
                  {label}{fixed && <span className="ml-1 text-[10px] text-slate-400">(고정)</span>}
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {value != null ? value.toFixed(4) : '—'}
                </p>
              </div>
            ))}
          </div>

          {/* 차트 3열 */}
          <div className="grid grid-cols-3 gap-4">
            <ConfusionMatrixChart metrics={adjustedMetrics} />
            <RocCurveChart metrics={selected.metrics} />
            <ScoreDistChart metrics={selected.metrics} thresholdValue={effectiveThreshold ?? undefined} />
          </div>

          {/* Tab5 이동 */}
          <div>
            <button
              onClick={() => navigate('/anomaly-map')}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              이 실험으로 Anomaly Map 보기 →
            </button>
          </div>
        </div>
      )}

      {/* 모델 저장 */}
      {selected?.status === 'completed' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-slate-800">모델 저장</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={savePath}
              onChange={e => setSavePath(e.target.value)}
              placeholder="저장 경로 (예: ./models/my_model/)"
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-shadow"
            />
            <button
              onClick={handleSave}
              disabled={saveLoading || !savePath.trim()}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg disabled:opacity-40 whitespace-nowrap transition-colors cursor-pointer"
            >
              {saveLoading ? '저장 중...' : '모델 저장'}
            </button>
          </div>
          {saveResult && (
            <p className={`text-xs whitespace-pre-wrap px-3 py-2 rounded-lg border ${saveResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
              {saveResult.msg}
            </p>
          )}
        </div>
      )}

      {/* 다중 실험 비교 */}
      {completed.length >= 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <ComparisonSection completed={completed} />
        </div>
      )}

      {/* 배치 실험 비교 */}
      {experiments.some(e => e.set_id) && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <BatchComparisonSection experiments={experiments} />
        </div>
      )}
    </div>
  );
}
