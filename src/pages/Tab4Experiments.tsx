import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExperiments, deleteExperiment } from '../api/experimentsApi';
import { startExport, getExportJobStatus } from '../api/exportApi';
import type { ExportJobStatus } from '../api/exportApi';
import { getBuildStatus, buildAnomalyMap, getJobStatus } from '../api/anomalyMapApi';
import { useExperimentsStore } from '../store/experimentsStore';
import { useConfigStore } from '../store/configStore';
import { useAnomalyMapStore } from '../store/anomalyMapStore';
import type { Experiment } from '../types/experiments';
import type { AnomalyMapStatus } from '../types/anomalyMap';
import { computeInitialThreshold } from '../utils/thresholdUtils';
import { paramSummary, fmt } from '../components/tab4/experimentUtils';
import ConfusionMatrixChart from '../components/tab4/ConfusionMatrixChart';
import RocCurveChart from '../components/tab4/RocCurveChart';
import ScoreDistChart from '../components/tab4/ScoreDistChart';
import ComparisonSection from '../components/tab4/ComparisonSection';
import BatchComparisonSection from '../components/tab4/BatchComparisonSection';
import { useTab4ColumnStore } from '../store/tab4ColumnStore';

const BASICS_COL_COUNT = 3;
const METRIC_COL_COUNT = 6;

const thCls = 'px-3 py-2 text-left text-xs font-semibold text-slate-500 whitespace-nowrap bg-slate-50 border-b border-slate-200';
const thGroupCls = `${thCls} cursor-pointer select-none hover:bg-slate-100 transition-colors border-l border-slate-200`;
const thSortCls = `${thCls} cursor-pointer select-none hover:text-slate-700`;

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

  const { deviceInfo } = useConfigStore();

  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  type ExportEntry = ExportJobStatus & { jobId: string };
  const [exportMap, setExportMap] = useState<Map<string, ExportEntry>>(new Map());
  const [exportFormat, setExportFormat] = useState<'onnx' | 'openvino' | 'trt'>('onnx');

  // Threshold 조정 상태
  const [adjustedThreshold, setAdjustedThreshold] = useState<number | null>(null);

  const selected  = experiments.find(e => e.experiment_id === selectedExperimentId) ?? null;
  const completed = experiments.filter(e => e.status === 'completed');

  const [buildStatus, setBuildStatus] = useState<AnomalyMapStatus | null>(null);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [localThreshold, setLocalThreshold] = useState<number | null>(null);
  const { setThreshold: storeThreshold } = useAnomalyMapStore();

  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function handleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  }

  const { basicsOpen, metricsOpen, setBasicsOpen, setMetricsOpen } = useTab4ColumnStore();

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

  const sortedExperiments = useMemo(() => {
    if (!sortCol) return experiments;
    return [...experiments].sort((a, b) => {
      let av: unknown, bv: unknown;
      switch (sortCol) {
        case '실험명':    av = a.name;               bv = b.name;               break;
        case '제품':      av = a.product_name ?? ''; bv = b.product_name ?? ''; break;
        case '모델':      av = a.model_type;         bv = b.model_type;         break;
        case '파라미터':  av = paramSummary(a);      bv = paramSummary(b);      break;
        case 'Accuracy':  av = a.metrics?.accuracy;  bv = b.metrics?.accuracy;  break;
        case 'Precision': av = a.metrics?.precision; bv = b.metrics?.precision; break;
        case 'Recall':    av = a.metrics?.recall;    bv = b.metrics?.recall;    break;
        case 'F1':        av = a.metrics?.f1_score;  bv = b.metrics?.f1_score;  break;
        case 'F2':        av = a.metrics?.f2_score;  bv = b.metrics?.f2_score;  break;
        case 'AUC':       av = a.metrics?.auc;       bv = b.metrics?.auc;       break;
        case '실행 시각': av = a.created_at;         bv = b.created_at;         break;
        case '상태':      av = a.status;             bv = b.status;             break;
        default: return 0;
      }
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [experiments, sortCol, sortDir]);

  const load = useCallback(async (autoSelect = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getExperiments();
      setExperiments(res.data);
      if (autoSelect) {
        const latest = res.data
          .filter(e => e.status === 'completed')
          .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
        if (latest) setSelectedExperimentId(latest.experiment_id);
      }
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? '실험 목록 로드 실패');
    } finally {
      setLoading(false);
    }
  }, [setSelectedExperimentId]);

  useEffect(() => { load(selectedExperimentId == null); }, [load]);

  // selected 변경 시 buildStatus fetch
  useEffect(() => {
    if (!selected || selected.status !== 'completed') {
      setBuildStatus(null);
      return;
    }
    getBuildStatus(selected.experiment_id)
      .then(res => setBuildStatus(res.data))
      .catch(() => setBuildStatus({ built: false, image_count: 0 }));
  }, [selected?.experiment_id]);

  // selected 변경 시 localThreshold 초기화
  useEffect(() => {
    if (!selected?.metrics) { setLocalThreshold(null); return; }
    setLocalThreshold(computeInitialThreshold(selected));
  }, [selected?.experiment_id]);

  // localThreshold 기반 지표 실시간 재계산
  const recomputed = useMemo(() => {
    const scores = selected?.metrics?.anomaly_scores ?? [];
    const labels = selected?.metrics?.image_labels ?? [];
    if (localThreshold == null || scores.length === 0 || labels.length !== scores.length) return null;
    const sMin = Math.min(...scores);
    const sMax = Math.max(...scores);
    const rawTh = sMax > sMin ? sMin + localThreshold * (sMax - sMin) : sMin;
    let tp = 0, fp = 0, tn = 0, fn = 0;
    for (let i = 0; i < scores.length; i++) {
      const pred = scores[i] >= rawTh ? 1 : 0;
      if (labels[i] === 1 && pred === 1) tp++;
      else if (labels[i] === 0 && pred === 1) fp++;
      else if (labels[i] === 0 && pred === 0) tn++;
      else fn++;
    }
    const n = tp + fp + tn + fn;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    return {
      accuracy:  n > 0 ? (tp + tn) / n : 0,
      precision,
      recall,
      f1_score:  precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0,
      f2_score:  precision + recall > 0 ? 5 * precision * recall / (4 * precision + recall) : 0,
    };
  }, [localThreshold, selected?.experiment_id]);

  async function handleBuild() {
    if (!selected) return;
    setBuilding(true);
    setBuildError(null);
    try {
      const res = await buildAnomalyMap(selected.experiment_id);
      const jobId = res.data.job_id;
      let done = false;
      while (!done) {
        await new Promise(r => setTimeout(r, 1000));
        const statusRes = await getJobStatus(jobId);
        if (statusRes.data.status === 'completed') done = true;
        else if (statusRes.data.status === 'failed')
          throw new Error(statusRes.data.error ?? '빌드 실패');
      }
      const newStatus = await getBuildStatus(selected.experiment_id);
      setBuildStatus(newStatus.data);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setBuildError(typeof detail === 'string' ? detail : (e as { message?: string })?.message ?? '빌드 실패');
    } finally {
      setBuilding(false);
    }
  }

  async function handleDeleteRow(expId: string) {
    try {
      await deleteExperiment(expId);
      if (selectedExperimentId === expId) setSelectedExperimentId(null);
      load();
    } catch { /* silent */ }
  }

  async function handleExport() {
    if (!selected) return;
    const expId = selected.experiment_id;
    const existing = exportMap.get(expId);
    if (existing?.status === 'pending' || existing?.status === 'running') return;

    try {
      const res = await startExport(expId, exportFormat);
      const jobId = res.data.job_id;
      setExportMap(prev => new Map(prev).set(expId, { jobId, status: 'pending', error: null, result: null }));

      let done = false;
      while (!done) {
        await new Promise(r => setTimeout(r, 1500));
        const statusRes = await getExportJobStatus(jobId);
        const { status, error, result } = statusRes.data;
        setExportMap(prev => new Map(prev).set(expId, { jobId, status, error: error ?? null, result }));
        if (status === 'completed' || status === 'failed') done = true;
      }
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (e as { message?: string })?.message ?? '내보내기 실패';
      setExportMap(prev => new Map(prev).set(expId, { jobId: '', status: 'failed', error: msg, result: null }));
    }
  }

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
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">실험 목록</h2>
        </div>
        <div className="overflow-x-auto overflow-y-auto max-h-[260px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              {/* Row 1: 그룹 헤더 */}
              <tr ref={groupHeaderRowRef}>
                <th rowSpan={2} className={`sticky left-0 z-30 border-r border-slate-200 cursor-pointer select-none hover:text-slate-700 ${thCls}`} onClick={() => handleSort('실험명')}>
                  실험명{sortCol === '실험명' && <span className="ml-1 text-sky-500">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th
                  colSpan={basicsOpen ? BASICS_COL_COUNT : 1}
                  className={thGroupCls}
                  onClick={() => setBasicsOpen(!basicsOpen)}
                >
                  {basicsOpen ? '▾' : '▸'} [기본]
                </th>
                <th
                  colSpan={metricsOpen ? METRIC_COL_COUNT : 1}
                  className={thGroupCls}
                  onClick={() => setMetricsOpen(!metricsOpen)}
                >
                  {metricsOpen ? '▾' : '▸'} [메트릭]
                </th>
                <th rowSpan={2} className={`sticky right-40 z-30 w-[10rem] cursor-pointer select-none hover:text-slate-700 ${thCls}`} onClick={() => handleSort('실행 시각')}>
                  실행 시각{sortCol === '실행 시각' && <span className="ml-1 text-sky-500">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th rowSpan={2} className={`sticky right-12 z-30 w-[7rem] cursor-pointer select-none hover:text-slate-700 ${thCls}`} onClick={() => handleSort('상태')}>
                  상태{sortCol === '상태' && <span className="ml-1 text-sky-500">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th rowSpan={2} className={`sticky right-0 z-30 w-[3rem] ${thCls}`} />
              </tr>
              {/* Row 2: 컬럼 헤더 */}
              <tr style={{ top: groupHeaderHeight }}>
                {basicsOpen ? (
                  <>
                    <th className={thSortCls} onClick={() => handleSort('제품')}>제품{sortCol === '제품' && <span className="ml-1 text-sky-500">{sortDir === 'asc' ? '↑' : '↓'}</span>}</th>
                    <th className={thSortCls} onClick={() => handleSort('모델')}>모델{sortCol === '모델' && <span className="ml-1 text-sky-500">{sortDir === 'asc' ? '↑' : '↓'}</span>}</th>
                    <th className={thSortCls} onClick={() => handleSort('파라미터')}>파라미터{sortCol === '파라미터' && <span className="ml-1 text-sky-500">{sortDir === 'asc' ? '↑' : '↓'}</span>}</th>
                  </>
                ) : (
                  <th />
                )}
                {metricsOpen ? (
                  <>
                    {(['Accuracy', 'Precision', 'Recall', 'F1', 'F2', 'AUC'] as const).map(h => (
                      <th key={h} className={thSortCls} onClick={() => handleSort(h)}>
                        {h}{sortCol === h && <span className="ml-1 text-sky-500">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </th>
                    ))}
                  </>
                ) : (
                  <th />
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedExperiments.map(e => {
                const isSelected = e.experiment_id === selectedExperimentId;
                const isDimmed = e.status === '중단';
                const m = e.metrics;
                const isCompleted = e.status === 'completed';
                const stickyBg = isSelected ? 'bg-sky-50' : 'bg-white group-hover:bg-slate-50';
                return (
                  <tr
                    key={e.experiment_id}
                    onClick={() => setSelectedExperimentId(isSelected ? null : e.experiment_id)}
                    className={`group cursor-pointer transition-colors ${isSelected ? 'bg-sky-50' : 'hover:bg-slate-50'} ${isDimmed ? 'opacity-50' : ''}`}
                  >
                    <td className={`sticky left-0 z-[1] px-3 py-2 font-medium text-slate-800 whitespace-nowrap border-r border-slate-200 ${stickyBg}`}>
                      {e.name}
                    </td>
                    {basicsOpen ? (
                      <>
                        <td className="px-3 py-2 text-slate-500">{e.product_name || '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{e.model_type}</td>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{paramSummary(e)}</td>
                      </>
                    ) : (
                      <td />
                    )}
                    {metricsOpen ? (
                      <>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">{isCompleted ? fmt(isSelected && recomputed ? recomputed.accuracy  : m?.accuracy)  : '—'}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">{isCompleted ? fmt(isSelected && recomputed ? recomputed.precision : m?.precision) : '—'}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">{isCompleted ? fmt(isSelected && recomputed ? recomputed.recall    : m?.recall)    : '—'}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">{isCompleted ? fmt(isSelected && recomputed ? recomputed.f1_score  : m?.f1_score)  : '—'}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">{isCompleted ? fmt(isSelected && recomputed ? recomputed.f2_score  : m?.f2_score)  : '—'}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800">{isCompleted ? fmt(m?.auc) : '—'}</td>
                      </>
                    ) : (
                      <td />
                    )}
                    <td className={`sticky right-40 z-[1] px-3 py-2 text-slate-500 whitespace-nowrap ${stickyBg}`}>
                      {e.created_at.slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className={`sticky right-12 z-[1] px-3 py-2 ${stickyBg}`}>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        e.status === 'completed' ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                      }`}>
                        {e.status === 'completed' ? (e.early_stopped ? '완료 (조기종료)' : '완료') : e.status}
                      </span>
                    </td>
                    <td className={`sticky right-0 z-[1] px-3 py-2 text-right ${stickyBg}`}>
                      <button
                        onClick={ev => { ev.stopPropagation(); handleDeleteRow(e.experiment_id); }}
                        className="text-slate-300 hover:text-red-400 cursor-pointer transition-colors"
                      >
                        삭제
                      </button>
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

          {/* 지표 카드 */}
          <div className="grid grid-cols-4 gap-4">
            {([
              { label: 'Accuracy', value: recomputed?.accuracy ?? selected.metrics.accuracy },
              { label: 'Precision', value: recomputed?.precision ?? selected.metrics.precision },
              { label: 'Recall',   value: recomputed?.recall   ?? selected.metrics.recall },
              { label: 'F1 Score', value: recomputed?.f1_score ?? selected.metrics.f1_score },
            ] as const).map(({ label, value }) => (
              <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
                <p className="text-2xl font-bold text-slate-900">{value != null ? value.toFixed(4) : '—'}</p>
              </div>
            ))}
          </div>

          {/* 차트 3열 */}
          <div className="grid grid-cols-3 gap-4">
            <ConfusionMatrixChart metrics={selected.metrics} threshold={localThreshold ?? undefined} />
            <RocCurveChart metrics={selected.metrics} threshold={localThreshold ?? undefined} />
            <ScoreDistChart
              metrics={selected.metrics}
              thresholdValue={localThreshold ?? undefined}
              onThresholdChange={setLocalThreshold}
            />
          </div>

          {/* Anomaly Map 빌드 / 보기 */}
          <div className="flex items-center gap-3 flex-wrap">
            {buildStatus?.built ? (
              <span className="text-xs text-emerald-600 font-medium">
                ✓ Anomaly Map 생성됨 ({buildStatus.image_count}개)
              </span>
            ) : (
              <span className="text-xs text-slate-400">Anomaly Map 미생성</span>
            )}

            <button
              onClick={handleBuild}
              disabled={building}
              className="px-4 py-2 border border-slate-300 text-sm rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              {building ? '생성 중...' : buildStatus?.built ? '재생성' : 'Anomaly Map 생성'}
            </button>

            <button
              onClick={() => {
                if (localThreshold != null) storeThreshold(localThreshold);
                navigate('/anomaly-map');
              }}
              disabled={!buildStatus?.built}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
            >
              이 threshold로 Anomaly Map 보기
            </button>
          </div>

          {buildError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {buildError}
            </p>
          )}
        </div>
      )}

      {/* 모델 내보내기 — EfficientAD completed 선택 시만 표시 */}
      {selected?.model_type === 'efficientad' && selected?.status === 'completed' && (() => {
        const entry = exportMap.get(selected.experiment_id);
        const isRunning = entry?.status === 'pending' || entry?.status === 'running';
        return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-slate-800">모델 내보내기</h3>
            <div className="flex gap-4">
              {([
                { value: 'onnx',     label: 'ONNX',       show: true },
                { value: 'openvino', label: 'OpenVINO',   show: !!deviceInfo?.openvino_available },
                { value: 'trt',      label: 'TensorRT',   show: !!deviceInfo?.trt_available },
              ] as const).filter(f => f.show).map(f => (
                <label key={f.value} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="export-format"
                    value={f.value}
                    checked={exportFormat === f.value}
                    onChange={() => setExportFormat(f.value)}
                    className="accent-sky-600"
                  />
                  <span className="text-sm text-slate-700">{f.label}</span>
                </label>
              ))}
            </div>
            <div>
              <button
                onClick={handleExport}
                disabled={isRunning}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
              >
                {isRunning ? '내보내는 중...' : '내보내기'}
              </button>
            </div>
            {entry?.status === 'completed' && entry.result && (
              <p className="text-xs px-3 py-2 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-700">
                완료 — {entry.result.saved_path}
              </p>
            )}
            {entry?.status === 'failed' && (
              <p className="text-xs px-3 py-2 rounded-lg border bg-red-50 border-red-200 text-red-600">
                {entry.error ?? '내보내기 실패'}
              </p>
            )}
          </div>
        );
      })()}

      {/* 다중 실험 비교 */}
      {completed.length >= 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <ComparisonSection completed={completed} />
        </div>
      )}

      {/* 배치 실험 비교 */}
      {experiments.some(e => e.set_id) && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <BatchComparisonSection experiments={experiments} />
        </div>
      )}
    </div>
  );
}
